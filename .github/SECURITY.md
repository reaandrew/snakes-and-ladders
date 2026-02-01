# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email the maintainer directly or use GitHub's private vulnerability reporting
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We aim to respond within 48 hours and will work with you to understand and resolve the issue.

## Security Measures

This project implements the following security measures:

### CI/CD Pipeline
- **Dependency Scanning**: pnpm audit and Trivy vulnerability scanning
- **SAST**: Semgrep static analysis
- **Secret Detection**: Gitleaks scanning in CI and pre-commit hooks
- **IaC Security**: tfsec and Checkov for Terraform
- **SBOM Generation**: Software Bill of Materials for supply chain transparency
- **Code Quality**: SonarCloud analysis

### Infrastructure
- **AWS IAM**: Least-privilege roles with GitHub OIDC (no long-lived credentials)
- **Encryption**: S3 bucket encryption, DynamoDB encryption at rest
- **HTTPS**: All traffic encrypted via CloudFront/ACM

### Development
- **Pre-commit Hooks**: Linting, formatting, type checking, secret scanning
- **Dependabot**: Automated dependency updates
- **Conventional Commits**: Enforced commit message format
