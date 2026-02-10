# =============================================================================
# EC2 Backend Infrastructure for Go WebSocket Server
# =============================================================================
#
# This creates:
# - VPC with public subnets (no NAT Gateway for cost savings)
# - ALB with HTTPS, sticky sessions, WebSocket support
# - Auto Scaling Group with Launch Template
# - Security Groups
# - IAM roles for EC2 instances
# - S3 bucket for deployment artifacts
# - Route53 record for api.snakes.techar.ch
# =============================================================================

locals {
  api_domain = "api.${var.domain_name}"
}

# =============================================================================
# ACM Certificate for API (regional - for ALB)
# =============================================================================

resource "aws_acm_certificate" "api" {
  domain_name       = local.api_domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = local.tags
}

resource "aws_route53_record" "api_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = [for record in aws_route53_record.api_cert_validation : record.fqdn]
}

# =============================================================================
# VPC and Networking
# =============================================================================

data "aws_availability_zones" "available" {
  state = "available"
}

#tfsec:ignore:aws-ec2-require-vpc-flow-logs-for-all-vpcs
resource "aws_vpc" "main" {
  #checkov:skip=CKV2_AWS_11:VPC flow logs add cost - not needed for casual game
  #checkov:skip=CKV2_AWS_12:Default SG is not used - custom SGs are attached to all resources
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.tags, {
    Name = "${local.project}-${local.env}-vpc"
  })
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(local.tags, {
    Name = "${local.project}-${local.env}-igw"
  })
}

#tfsec:ignore:aws-ec2-no-public-ip-subnet
resource "aws_subnet" "public" {
  #checkov:skip=CKV_AWS_130:Public subnets by design - saves NAT Gateway cost (~$32/mo)
  count = 2

  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = merge(local.tags, {
    Name = "${local.project}-${local.env}-public-${count.index + 1}"
  })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(local.tags, {
    Name = "${local.project}-${local.env}-public-rt"
  })
}

resource "aws_route_table_association" "public" {
  count = 2

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# =============================================================================
# Security Groups
# =============================================================================

resource "aws_security_group" "alb" {
  #checkov:skip=CKV2_AWS_5:Security group is attached to ALB resource below
  name        = "${local.project}-${local.env}-alb-sg"
  description = "Security group for ALB"
  vpc_id      = aws_vpc.main.id

  tags = merge(local.tags, {
    Name = "${local.project}-${local.env}-alb-sg"
  })
}

resource "aws_vpc_security_group_ingress_rule" "alb_https" {
  security_group_id = aws_security_group.alb.id
  description       = "HTTPS from internet"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"

  tags = local.tags
}

resource "aws_vpc_security_group_egress_rule" "alb_to_ec2" {
  security_group_id            = aws_security_group.alb.id
  description                  = "HTTP to EC2 instances"
  from_port                    = 8080
  to_port                      = 8080
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.ec2.id

  tags = local.tags
}

resource "aws_security_group" "ec2" {
  #checkov:skip=CKV2_AWS_5:Security group is attached to launch template below
  name        = "${local.project}-${local.env}-ec2-sg"
  description = "Security group for EC2 instances"
  vpc_id      = aws_vpc.main.id

  tags = merge(local.tags, {
    Name = "${local.project}-${local.env}-ec2-sg"
  })
}

resource "aws_vpc_security_group_ingress_rule" "ec2_from_alb" {
  security_group_id            = aws_security_group.ec2.id
  description                  = "HTTP from ALB"
  from_port                    = 8080
  to_port                      = 8080
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.alb.id

  tags = local.tags
}

resource "aws_vpc_security_group_egress_rule" "ec2_https" {
  security_group_id = aws_security_group.ec2.id
  description       = "HTTPS for S3 and CloudWatch"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"

  tags = local.tags
}

# =============================================================================
# S3 Deploy Bucket
# =============================================================================

#tfsec:ignore:aws-s3-enable-bucket-logging
resource "aws_s3_bucket" "deploy" {
  #checkov:skip=CKV2_AWS_62:Event notifications not needed for deploy bucket
  #checkov:skip=CKV_AWS_144:Cross-region replication adds cost - single region deployment
  #checkov:skip=CKV_AWS_18:Access logging not needed for deploy artifacts
  #checkov:skip=CKV_AWS_145:KMS adds cost - AES256 is sufficient for deploy artifacts
  bucket = "${local.project}-${local.env}-deploy"

  tags = local.tags
}

resource "aws_s3_bucket_public_access_block" "deploy" {
  bucket = aws_s3_bucket.deploy.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "deploy" {
  bucket = aws_s3_bucket.deploy.id
  versioning_configuration {
    status = "Enabled"
  }
}

#tfsec:ignore:aws-s3-encryption-customer-key
resource "aws_s3_bucket_server_side_encryption_configuration" "deploy" {
  bucket = aws_s3_bucket.deploy.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "deploy" {
  bucket = aws_s3_bucket.deploy.id

  rule {
    id     = "cleanup-old-versions"
    status = "Enabled"

    filter {
      prefix = ""
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# =============================================================================
# IAM Role for EC2
# =============================================================================

resource "aws_iam_role" "ec2" {
  name = "${local.project}-${local.env}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "ec2_ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "ec2_cloudwatch" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_role_policy" "ec2_s3" {
  name = "s3-deploy-access"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.deploy.arn,
          "${aws_s3_bucket.deploy.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${local.project}-${local.env}-ec2-profile"
  role = aws_iam_role.ec2.name

  tags = local.tags
}

# =============================================================================
# Application Load Balancer
# =============================================================================

#tfsec:ignore:aws-elb-alb-not-public
resource "aws_lb" "main" {
  #checkov:skip=CKV_AWS_150:Deletion protection disabled for cost - casual game project
  #checkov:skip=CKV_AWS_91:Access logging to S3 adds cost - CloudWatch metrics sufficient
  #checkov:skip=CKV2_AWS_28:WAF for ALB adds cost - rate limiting in app is sufficient
  name               = "${local.project}-${local.env}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = false
  drop_invalid_header_fields = true

  tags = local.tags
}

resource "aws_lb_target_group" "main" {
  name     = "${local.project}-${local.env}-tg"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    matcher             = "200"
  }

  # Sticky sessions for WebSocket - 24 hour duration
  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }

  tags = local.tags
}

resource "aws_lb_listener" "https" {
  #checkov:skip=CKV_AWS_103:TLS 1.2 is already used by ELBSecurityPolicy-TLS13-1-2-2021-06
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.api.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }

  tags = local.tags
}

# =============================================================================
# Launch Template
# =============================================================================

resource "aws_launch_template" "main" {
  #checkov:skip=CKV_AWS_79:Metadata v2 enforcement is configured below
  #checkov:skip=CKV_AWS_88:Public IP required - using public subnets to avoid NAT Gateway cost
  name          = "${local.project}-${local.env}-lt"
  image_id      = data.aws_ami.amazon_linux_2023.id
  instance_type = "t3.xlarge"

  iam_instance_profile {
    arn = aws_iam_instance_profile.ec2.arn
  }

  network_interfaces {
    associate_public_ip_address = true
    security_groups             = [aws_security_group.ec2.id]
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
    instance_metadata_tags      = "enabled"
  }

  monitoring {
    enabled = true
  }

  user_data = base64encode(templatefile("${path.module}/userdata.sh.tpl", {
    deploy_bucket   = aws_s3_bucket.deploy.bucket
    aws_region      = var.aws_region
    allowed_origins = "https://${var.domain_name}"
    log_group_name  = aws_cloudwatch_log_group.ec2.name
  }))

  tag_specifications {
    resource_type = "instance"
    tags = merge(local.tags, {
      Name = "${local.project}-${local.env}-server"
    })
  }

  tag_specifications {
    resource_type = "volume"
    tags          = local.tags
  }

  tags = local.tags
}

data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# =============================================================================
# Auto Scaling Group
# =============================================================================

resource "aws_autoscaling_group" "main" {
  #checkov:skip=CKV_AWS_315:Multi-AZ is configured via vpc_zone_identifier
  name                = "${local.project}-${local.env}-asg"
  vpc_zone_identifier = aws_subnet.public[*].id
  target_group_arns   = [aws_lb_target_group.main.arn]

  min_size         = 1
  max_size         = 3
  desired_capacity = 1

  health_check_type         = "ELB"
  health_check_grace_period = 120

  launch_template {
    id      = aws_launch_template.main.id
    version = "$Latest"
  }

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
  }

  tag {
    key                 = "Name"
    value               = "${local.project}-${local.env}-server"
    propagate_at_launch = true
  }

  dynamic "tag" {
    for_each = local.tags
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }
}

# Simple CPU-based scaling policy
resource "aws_autoscaling_policy" "scale_up" {
  name                   = "${local.project}-${local.env}-scale-up"
  scaling_adjustment     = 1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.main.name
}

resource "aws_autoscaling_policy" "scale_down" {
  name                   = "${local.project}-${local.env}-scale-down"
  scaling_adjustment     = -1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.main.name
}

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${local.project}-${local.env}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 70
  alarm_description   = "Scale up when CPU exceeds 70%"
  alarm_actions       = [aws_autoscaling_policy.scale_up.arn]

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.main.name
  }

  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "cpu_low" {
  alarm_name          = "${local.project}-${local.env}-cpu-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 30
  alarm_description   = "Scale down when CPU below 30%"
  alarm_actions       = [aws_autoscaling_policy.scale_down.arn]

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.main.name
  }

  tags = local.tags
}

# =============================================================================
# CloudWatch Log Group for EC2
# =============================================================================

#tfsec:ignore:aws-cloudwatch-log-group-customer-key
resource "aws_cloudwatch_log_group" "ec2" {
  #checkov:skip=CKV_AWS_338:14-day retention is sufficient for game logs - cost optimization
  #checkov:skip=CKV_AWS_158:KMS encryption adds cost - not needed for game logs
  name              = "/ec2/${local.project}-${local.env}"
  retention_in_days = 14

  tags = local.tags
}

# =============================================================================
# Route53 DNS Record for API
# =============================================================================

resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = local.api_domain
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
