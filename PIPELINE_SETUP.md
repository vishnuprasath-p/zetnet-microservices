# Complete CI/CD Pipeline Setup Guide

## 🎯 Overview

This guide will help you set up automated CI/CD pipeline that:
1. ✅ Builds Docker images when you push to `main` branch
2. 🚀 Automatically deploys to your kubeadm K8s cluster in GCP
3. 📊 Shows deployment status

---

## 📋 Prerequisites Checklist

- [ ] Docker Hub account
- [ ] Kubeadm cluster running in GCP
- [ ] kubectl access to your cluster
- [ ] GitHub repository (already done ✅)
- [ ] All secrets ready (Supabase, Twilio, JWT, etc.)

---

## 🚀 Step-by-Step Setup

### Step 1: Get Your Kubeconfig

#### Option A: From Master Node (Quick)
```bash
# SSH to your master node
gcloud compute ssh your-master-vm-name --zone=your-zone

# Get kubeconfig and encode to base64
sudo cat /etc/kubernetes/admin.conf | base64 -w 0
```

Copy the entire base64 output.

#### Option B: Create Service Account (Secure)
```bash
# SSH to master node
gcloud compute ssh your-master-vm-name --zone=your-zone

# Download and run the script
curl -o create-sa.sh https://raw.githubusercontent.com/vishnuprasath-p/zetnet-microservices/main/infra/kubernetes/create-github-sa.sh
chmod +x create-sa.sh
./create-sa.sh
```

Copy the base64 output from the script.

---

### Step 2: Make API Server Accessible

Your K8s API server needs to be accessible from GitHub Actions.

#### Check Current Setup
```bash
# Get your master node's external IP
gcloud compute instances list | grep master

# Check if port 6443 is open
gcloud compute firewall-rules list | grep 6443
```

#### Open Firewall (if needed)
```bash
# Create firewall rule to allow GitHub Actions to access API server
gcloud compute firewall-rules create k8s-api-server-github \
  --allow tcp:6443 \
  --source-ranges 0.0.0.0/0 \
  --description "Allow GitHub Actions to access K8s API server" \
  --target-tags k8s-master

# Apply tag to master node
gcloud compute instances add-tags your-master-vm-name \
  --tags k8s-master \
  --zone your-zone
```

⚠️ **Security Note**: For production, restrict source-ranges to GitHub Actions IP ranges.

---

### Step 3: Add GitHub Secrets

Go to: https://github.com/vishnuprasath-p/zetnet-microservices/settings/secrets/actions

Click **"New repository secret"** and add each of these:

#### Docker Registry Secrets
```
Name: DOCKER_USERNAME
Value: your-dockerhub-username

Name: DOCKER_PASSWORD
Value: your-dockerhub-password-or-token
```

💡 **Tip**: Use Docker Hub Access Token instead of password:
- Go to https://hub.docker.com/settings/security
- Click "New Access Token"
- Copy and use as DOCKER_PASSWORD

#### Kubernetes Secret
```
Name: KUBE_CONFIG
Value: <paste-the-base64-encoded-kubeconfig-from-step-1>
```

#### Application Secrets
```
Name: SUPABASE_URL
Value: https://your-project.supabase.co

Name: SUPABASE_SERVICE_ROLE_KEY
Value: your-supabase-service-role-key

Name: JWT_SECRET
Value: your-jwt-secret-key

Name: JWT_REFRESH_SECRET
Value: your-jwt-refresh-secret-key

Name: TWILIO_ACCOUNT_SID
Value: your-twilio-account-sid

Name: TWILIO_AUTH_TOKEN
Value: your-twilio-auth-token

Name: TWILIO_WHATSAPP_FROM
Value: whatsapp:+1234567890

Name: ADMIN_WHATSAPP_NUMBER
Value: whatsapp:+1234567890
```

---

### Step 4: Update Kubernetes Manifests

Update the image registry in your K8s manifests:

```powershell
# Windows PowerShell
cd c:\Zetnetapp\zetnet-microservices

# Replace YOUR_REGISTRY with your Docker Hub username
$DOCKER_USERNAME = "vishnuprasath"  # Change this

(Get-Content infra/kubernetes/gateway.yaml) -replace 'YOUR_REGISTRY', $DOCKER_USERNAME | Set-Content infra/kubernetes/gateway.yaml
(Get-Content infra/kubernetes/auth.yaml) -replace 'YOUR_REGISTRY', $DOCKER_USERNAME | Set-Content infra/kubernetes/auth.yaml
(Get-Content infra/kubernetes/computer.yaml) -replace 'YOUR_REGISTRY', $DOCKER_USERNAME | Set-Content infra/kubernetes/computer.yaml
(Get-Content infra/kubernetes/services.yaml) -replace 'YOUR_REGISTRY', $DOCKER_USERNAME | Set-Content infra/kubernetes/services.yaml

# Commit changes
git add infra/kubernetes/*.yaml
git commit -m "Update Docker registry in K8s manifests"
git push origin feature-login
```

---

### Step 5: Update Secrets YAML

Edit `infra/kubernetes/secrets.yaml` with your actual values:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: zetnet-secrets
  namespace: zetnet
type: Opaque
stringData:
  SUPABASE_URL: "https://your-actual-project.supabase.co"
  SUPABASE_SERVICE_ROLE_KEY: "your-actual-key"
  JWT_SECRET: "your-actual-jwt-secret"
  JWT_REFRESH_SECRET: "your-actual-refresh-secret"
  TWILIO_ACCOUNT_SID: "your-actual-sid"
  TWILIO_AUTH_TOKEN: "your-actual-token"
  TWILIO_WHATSAPP_FROM: "whatsapp:+your-actual-number"
  ADMIN_WHATSAPP_NUMBER: "whatsapp:+your-actual-admin-number"
```

⚠️ **Important**: Don't commit this file with real secrets! Add to .gitignore:

```bash
echo "infra/kubernetes/secrets.yaml" >> .gitignore
```

---

### Step 6: Test Pipeline Locally (Optional)

Before triggering the pipeline, test locally:

```powershell
# Build one service locally
docker build -t vishnuprasath/zetnet-gateway:test -f gateway/Dockerfile .

# Test if it runs
docker run -p 3000:3000 vishnuprasath/zetnet-gateway:test
```

---

### Step 7: Trigger the Pipeline

#### Option A: Merge to Main (Automatic)
```bash
# Merge feature-login to main
git checkout main
git merge feature-login
git push origin main
```

This will automatically trigger the CI/CD pipeline!

#### Option B: Manual Trigger
1. Go to: https://github.com/vishnuprasath-p/zetnet-microservices/actions
2. Click "CI/CD Pipeline"
3. Click "Run workflow"
4. Select branch: `main`
5. Click "Run workflow"

---

### Step 8: Monitor the Pipeline

1. Go to: https://github.com/vishnuprasath-p/zetnet-microservices/actions
2. Click on the running workflow
3. Watch the progress:
   - ✅ Test & Lint
   - 🐳 Build & Push (7 services)
   - 🚀 Deploy to K8s

---

### Step 9: Verify Deployment

Once pipeline completes, check your cluster:

```bash
# Check pods
kubectl get pods -n zetnet

# Check services
kubectl get services -n zetnet

# Get Gateway URL
kubectl get service gateway-service -n zetnet

# Test the API
curl http://<EXTERNAL-IP>/health
```

---

## 🔄 Pipeline Workflow

```
Push to main branch
    ↓
GitHub Actions triggered
    ↓
Job 1: Test & Lint
    ├─ Install dependencies
    ├─ Run linting
    ├─ Run tests
    └─ Build verification
    ↓
Job 2: Build & Push (parallel for 7 services)
    ├─ gateway
    ├─ auth
    ├─ computer
    ├─ travel
    ├─ solutions
    ├─ enquiry
    └─ notification
    ↓
Job 3: Deploy to K8s
    ├─ Create namespace
    ├─ Apply ConfigMap
    ├─ Apply Secrets
    ├─ Deploy all services
    ├─ Wait for rollout
    └─ Show status
    ↓
✅ Live in production!
```

---

## 🛠️ Troubleshooting

### Pipeline fails at "Build and push"

**Error**: `denied: requested access to the resource is denied`

**Solution**:
- Verify DOCKER_USERNAME and DOCKER_PASSWORD secrets
- Make sure you're logged into Docker Hub
- Check if repository exists on Docker Hub

### Pipeline fails at "Configure kubectl"

**Error**: `Unable to connect to the server`

**Solution**:
- Verify KUBE_CONFIG secret is correct base64
- Check if API server is accessible (port 6443 open)
- Verify firewall rules in GCP

### Pipeline fails at "Deploy"

**Error**: `error: unable to recognize "infra/kubernetes/auth.yaml"`

**Solution**:
- Check if namespace exists
- Verify YAML syntax
- Check RBAC permissions

### Pods in CrashLoopBackOff

**Check logs**:
```bash
kubectl logs <pod-name> -n zetnet
kubectl describe pod <pod-name> -n zetnet
```

**Common issues**:
- Wrong Supabase credentials
- Missing environment variables
- Database connection issues

### ImagePullBackOff

**Solution**:
- Verify image name and tag
- Check if images were pushed successfully
- Verify Docker Hub repository is public (or add imagePullSecrets)

---

## 🔐 Security Best Practices

1. ✅ Use Docker Hub Access Tokens instead of passwords
2. ✅ Create dedicated service account for GitHub Actions
3. ✅ Restrict API server access by IP ranges
4. ✅ Don't commit secrets to repository
5. ✅ Rotate secrets regularly
6. ✅ Use GitHub environment protection rules
7. ✅ Enable branch protection on main

---

## 📊 Monitoring After Deployment

### View Logs
```bash
# Gateway logs
kubectl logs -f deployment/gateway -n zetnet

# All services
kubectl logs -f -l app=gateway -n zetnet
```

### Check Resource Usage
```bash
kubectl top pods -n zetnet
kubectl top nodes
```

### Scale Services
```bash
kubectl scale deployment gateway --replicas=3 -n zetnet
```

---

## 🚀 Advanced: Add LoadBalancer

If your GCP setup doesn't have LoadBalancer support, use NodePort:

```yaml
# Edit infra/kubernetes/gateway.yaml
spec:
  type: NodePort  # Change from LoadBalancer
  selector:
    app: gateway
  ports:
  - port: 80
    targetPort: 3000
    nodePort: 30000  # Add this
```

Access via: `http://<node-external-ip>:30000`

---

## 📝 Quick Commands Reference

```bash
# View pipeline runs
gh run list

# Watch latest run
gh run watch

# View logs
gh run view --log

# Re-run failed jobs
gh run rerun <run-id>

# Trigger manual deployment
gh workflow run cicd.yml

# Check cluster
kubectl get all -n zetnet

# Delete everything
kubectl delete namespace zetnet
```

---

## ✅ Final Checklist

Before going live:

- [ ] All GitHub secrets added
- [ ] Kubeconfig tested and working
- [ ] API server accessible from internet
- [ ] Docker images building successfully
- [ ] Secrets.yaml updated with real values
- [ ] Pipeline runs without errors
- [ ] Pods are running
- [ ] Gateway is accessible
- [ ] API endpoints responding
- [ ] Database connections working
- [ ] Monitoring set up

---

## 🎉 You're Done!

Your CI/CD pipeline is now set up! Every push to `main` will:
1. Build Docker images
2. Push to Docker Hub
3. Deploy to your K8s cluster

**Next Steps**:
- Set up monitoring (Prometheus/Grafana)
- Configure alerts
- Add integration tests
- Set up staging environment
