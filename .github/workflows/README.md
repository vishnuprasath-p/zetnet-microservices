# GitHub Actions CI/CD Setup Guide

## Overview

Automated CI/CD pipeline that:
1. ✅ Tests and lints code on every push/PR
2. 🐳 Builds Docker images on main branch
3. 🚀 Deploys to your managed Kubernetes cluster automatically

## Required GitHub Secrets

Go to your repository → Settings → Secrets and variables → Actions → New repository secret

### Docker Registry Secrets
```
DOCKER_USERNAME=your-dockerhub-username
DOCKER_PASSWORD=your-dockerhub-password-or-token
```

### Kubernetes Cluster Secret
```
KUBE_CONFIG=<base64-encoded-kubeconfig>
```

To get your kubeconfig in base64:
```bash
# Linux/Mac
cat ~/.kube/config | base64 -w 0

# Windows PowerShell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content $HOME\.kube\config -Raw)))
```

### Application Secrets
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-jwt-refresh-secret-key
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_FROM=whatsapp:+1234567890
ADMIN_WHATSAPP_NUMBER=whatsapp:+1234567890
```

## Workflow Files

### 1. `cicd.yml` - Complete CI/CD Pipeline
**Triggers:**
- Push to `main` or `develop` branch
- Pull requests to `main`
- Manual trigger via GitHub UI

**Jobs:**
1. **Test** - Runs tests and linting
2. **Build & Push** - Builds Docker images and pushes to registry (main branch only)
3. **Deploy** - Deploys to K8s cluster (main branch only)

### 2. `ci.yml` - Continuous Integration Only
**Triggers:**
- Push to any branch
- Pull requests

**Jobs:**
- Lint and test code
- Build verification

### 3. `docker-build.yml` - Manual Docker Build
**Triggers:**
- Manual trigger only

**Jobs:**
- Build and push all service images

### 4. `deploy-k8s.yml` - Manual Deployment
**Triggers:**
- After successful Docker build
- Manual trigger

**Jobs:**
- Deploy to Kubernetes cluster

## Setup Steps

### Step 1: Add Secrets to GitHub

1. Go to https://github.com/vishnuprasath-p/zetnet-microservices/settings/secrets/actions
2. Click "New repository secret"
3. Add all secrets listed above

### Step 2: Update Kubernetes Manifests

The workflow automatically updates image registry, but verify your manifests:

```bash
# Check that YOUR_REGISTRY placeholder exists
grep "YOUR_REGISTRY" infra/kubernetes/*.yaml
```

### Step 3: Commit and Push Workflows

```bash
git add .github/
git commit -m "Add GitHub Actions CI/CD workflows"
git push origin main
```

### Step 4: Monitor First Run

1. Go to https://github.com/vishnuprasath-p/zetnet-microservices/actions
2. Watch the workflow execution
3. Check logs if any step fails

## Manual Deployment

### Trigger via GitHub UI

1. Go to Actions tab
2. Select "CI/CD Pipeline" workflow
3. Click "Run workflow"
4. Select branch and click "Run workflow"

### Trigger via GitHub CLI

```bash
gh workflow run cicd.yml
```

## Workflow Behavior

### On Pull Request
- ✅ Runs tests and linting
- ❌ Does NOT build images
- ❌ Does NOT deploy

### On Push to `develop`
- ✅ Runs tests and linting
- ❌ Does NOT build images
- ❌ Does NOT deploy

### On Push to `main`
- ✅ Runs tests and linting
- ✅ Builds Docker images
- ✅ Pushes to Docker Hub
- ✅ Deploys to K8s cluster

## Monitoring Deployments

### View Workflow Logs
```
https://github.com/vishnuprasath-p/zetnet-microservices/actions
```

### Check Deployment Status
```bash
kubectl get pods -n zetnet
kubectl get services -n zetnet
kubectl logs -f deployment/gateway -n zetnet
```

### Get Gateway URL
```bash
kubectl get service gateway-service -n zetnet
```

## Rollback

### Via kubectl
```bash
# Rollback to previous version
kubectl rollout undo deployment/gateway -n zetnet
kubectl rollout undo deployment/auth -n zetnet
# ... etc

# Rollback to specific revision
kubectl rollout history deployment/gateway -n zetnet
kubectl rollout undo deployment/gateway -n zetnet --to-revision=2
```

### Via GitHub
1. Revert the commit that caused issues
2. Push to main
3. Workflow will auto-deploy the reverted version

## Troubleshooting

### Build Fails
- Check Docker credentials
- Verify Dockerfile paths
- Check build logs in Actions tab

### Deployment Fails
- Verify KUBE_CONFIG secret is correct
- Check cluster connectivity
- Verify namespace exists
- Check image pull secrets

### Pods CrashLooping
- Check application logs: `kubectl logs <pod-name> -n zetnet`
- Verify secrets are correct
- Check environment variables

### ImagePullBackOff
- Verify Docker Hub credentials
- Check image names and tags
- Ensure images were pushed successfully

## Advanced Configuration

### Change Deployment Strategy

Edit deployment YAML files:
```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

### Add Health Checks

Already configured in manifests:
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
readinessProbe:
  httpGet:
    path: /health
    port: 3000
```

### Enable Auto-scaling

Create HPA (Horizontal Pod Autoscaler):
```bash
kubectl autoscale deployment gateway -n zetnet --cpu-percent=70 --min=2 --max=10
```

### Add Slack Notifications

Add to workflow:
```yaml
- name: Notify Slack
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Security Best Practices

1. ✅ Never commit secrets to repository
2. ✅ Use GitHub Secrets for sensitive data
3. ✅ Rotate secrets regularly
4. ✅ Use least-privilege access for service accounts
5. ✅ Enable branch protection rules
6. ✅ Require PR reviews before merging to main
7. ✅ Use signed commits

## Next Steps

1. Set up monitoring (Prometheus/Grafana)
2. Configure log aggregation (ELK/Loki)
3. Add integration tests
4. Set up staging environment
5. Implement blue-green deployments
6. Add performance testing
7. Configure backup strategy
