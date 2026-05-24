# 🚀 Quick Setup Checklist

## ✅ Step 1: Add GitHub Secrets

Go to: https://github.com/vishnuprasath-p/zetnet-microservices/settings/secrets/actions

Add these secrets:

### Docker Hub
- [ ] `DOCKER_USERNAME` - Your Docker Hub username
- [ ] `DOCKER_PASSWORD` - Your Docker Hub password or access token

### Kubernetes Cluster
- [ ] `KUBE_CONFIG` - Base64 encoded kubeconfig file

**Get kubeconfig in base64:**
```powershell
# Windows PowerShell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content $HOME\.kube\config -Raw)))
```

### Application Secrets
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `JWT_SECRET`
- [ ] `JWT_REFRESH_SECRET`
- [ ] `TWILIO_ACCOUNT_SID`
- [ ] `TWILIO_AUTH_TOKEN`
- [ ] `TWILIO_WHATSAPP_FROM`
- [ ] `ADMIN_WHATSAPP_NUMBER`

## ✅ Step 2: Merge to Main Branch

```bash
# Create PR and merge feature-login to main
# Or directly:
git checkout main
git merge feature-login
git push origin main
```

## ✅ Step 3: Watch Workflow Run

1. Go to: https://github.com/vishnuprasath-p/zetnet-microservices/actions
2. Watch "CI/CD Pipeline" workflow execute
3. It will:
   - ✅ Test & lint code
   - 🐳 Build 7 Docker images
   - 📤 Push to Docker Hub
   - 🚀 Deploy to your K8s cluster

## ✅ Step 4: Verify Deployment

```bash
kubectl get pods -n zetnet
kubectl get services -n zetnet
kubectl get service gateway-service -n zetnet
```

## 📋 Available Workflows

### 1. **CI/CD Pipeline** (cicd.yml)
- **Trigger:** Push to main/develop, PR to main
- **Does:** Test → Build → Deploy (on main only)

### 2. **CI Only** (ci.yml)
- **Trigger:** Push to any branch, PRs
- **Does:** Test & lint only

### 3. **Docker Build** (docker-build.yml)
- **Trigger:** Manual or push to main
- **Does:** Build and push images

### 4. **Deploy to K8s** (deploy-k8s.yml)
- **Trigger:** After Docker build or manual
- **Does:** Deploy to cluster

### 5. **Manual Deploy** (manual-deploy.yml)
- **Trigger:** Manual only
- **Does:** Deploy specific service or all

## 🎯 Manual Deployment

### Via GitHub UI
1. Go to Actions tab
2. Select "Manual Deploy"
3. Click "Run workflow"
4. Choose service and image tag
5. Click "Run workflow"

### Deploy Specific Service
```bash
# Via GitHub CLI
gh workflow run manual-deploy.yml -f service=gateway -f image_tag=latest
```

## 🔄 Typical Workflow

```
Developer pushes to feature branch
    ↓
CI runs (test & lint)
    ↓
Create PR to main
    ↓
Review & merge
    ↓
CI/CD Pipeline triggers:
    ├─ Test & lint
    ├─ Build Docker images
    ├─ Push to registry
    └─ Deploy to K8s cluster
    ↓
✅ Live in production!
```

## 📊 Monitor Deployment

```bash
# Watch pods
kubectl get pods -n zetnet -w

# View logs
kubectl logs -f deployment/gateway -n zetnet

# Check service
kubectl get service gateway-service -n zetnet
```

## 🆘 Troubleshooting

### Workflow fails at "Build and push"
- Check DOCKER_USERNAME and DOCKER_PASSWORD secrets
- Verify Docker Hub account is active

### Workflow fails at "Deploy"
- Check KUBE_CONFIG secret is correct
- Verify cluster is accessible
- Check kubectl version compatibility

### Pods in CrashLoopBackOff
- Check application secrets are correct
- View pod logs: `kubectl logs <pod-name> -n zetnet`
- Check Supabase connection

## 📚 Documentation

- Full guide: `.github/workflows/README.md`
- K8s deployment: `infra/kubernetes/DEPLOYMENT.md`
- Project README: `README.md`

## 🎉 Next Steps

1. Set up monitoring (Prometheus/Grafana)
2. Configure alerts
3. Add integration tests
4. Set up staging environment
5. Implement blue-green deployments
