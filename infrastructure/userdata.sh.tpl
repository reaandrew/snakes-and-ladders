#!/bin/bash
set -euo pipefail

# =============================================================================
# Snakes and Ladders - EC2 Userdata Script
# =============================================================================
# This script:
# 1. Downloads the Go binary from S3
# 2. Creates a systemd service
# 3. Configures CloudWatch agent for logs/metrics
# 4. Starts the service
# =============================================================================

exec > >(tee /var/log/userdata.log | logger -t userdata) 2>&1
echo "Starting userdata script at $(date)"

# Variables from Terraform
DEPLOY_BUCKET="${deploy_bucket}"
AWS_REGION="${aws_region}"
ALLOWED_ORIGINS="${allowed_origins}"

# Create app directory
mkdir -p /opt/snakes-server
cd /opt/snakes-server

# Download Go binary from S3
echo "Downloading application binary from S3..."
aws s3 cp "s3://$DEPLOY_BUCKET/snakes-server" /opt/snakes-server/snakes-server --region "$AWS_REGION"
chmod +x /opt/snakes-server/snakes-server

# Create systemd service file
echo "Creating systemd service..."
cat > /etc/systemd/system/snakes-server.service << 'SERVICEEOF'
[Unit]
Description=Snakes and Ladders Game Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/snakes-server
ExecStart=/opt/snakes-server/snakes-server
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

# Environment variables
Environment=PORT=8080
Environment=ALLOWED_ORIGINS=${allowed_origins}

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/snakes-server

# Resource limits
LimitNOFILE=65535
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
SERVICEEOF

# Install and configure CloudWatch Agent
echo "Installing CloudWatch Agent..."
dnf install -y amazon-cloudwatch-agent

# Create CloudWatch Agent configuration
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'CWEOF'
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "root"
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/messages",
            "log_group_name": "/ec2/snakes-and-ladders-prod",
            "log_stream_name": "{instance_id}/messages",
            "retention_in_days": 14
          }
        ]
      }
    },
    "log_stream_name": "{instance_id}/default"
  },
  "metrics": {
    "namespace": "SnakesAndLadders",
    "metrics_collected": {
      "cpu": {
        "measurement": ["cpu_usage_idle", "cpu_usage_user", "cpu_usage_system"],
        "metrics_collection_interval": 60
      },
      "mem": {
        "measurement": ["mem_used_percent"],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": ["disk_used_percent"],
        "metrics_collection_interval": 60,
        "resources": ["/"]
      },
      "net": {
        "measurement": ["net_bytes_recv", "net_bytes_sent"],
        "metrics_collection_interval": 60
      }
    },
    "append_dimensions": {
      "InstanceId": "\$${aws:InstanceId}",
      "AutoScalingGroupName": "\$${aws:AutoScalingGroupName}"
    }
  }
}
CWEOF

# Start CloudWatch Agent
echo "Starting CloudWatch Agent..."
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# Enable and start the game server
echo "Starting snakes-server service..."
systemctl daemon-reload
systemctl enable snakes-server
systemctl start snakes-server

# Verify service is running
sleep 5
if systemctl is-active --quiet snakes-server; then
  echo "snakes-server started successfully!"
  # Test health endpoint
  curl -s http://localhost:8080/health || echo "Health check failed but service is running"
else
  echo "ERROR: snakes-server failed to start"
  journalctl -u snakes-server --no-pager -n 50
  exit 1
fi

echo "Userdata script completed at $(date)"
