# Kubernetes Deployment Guide

## Prerequisites

1. **Docker** installed and running
2. **kubectl** installed and configured
3. **Kubernetes cluster** (minikube, EKS, GKE, AKS, or any K8s cluster)
4. **Docker registry** access (Docker Hub, ECR, GCR, ACR, etc.)

## Step 1: Build Docker Images

### Option A: Using PowerShell (Windows)
```powershell
cd c:\Zetnetapp\zetnet-microservices
.\infra\docker\build-all.ps1
```

### Option B: Using Bash (Linux/Mac)
```bash
cd /path/to/zetnet-microservices
chmod +x infra/docker/build-all.sh
./infra/docker/build-all.sh
```

### Option C: Manual Build
```bash
# Build each service individually
docker build -t your-registry/zetnet-gateway:1.0.0 -f gateway/Dockerfile .
docker build -t your-registry/zetnet-auth:1.0.0 -f services/auth/Dockerfile .
docker build -t your-registry/zetnet-computer:1.0.0 -f services/computer/Dockerfile .
docker build -t your-registry/zetnet-travel:1.0.0 -f services/travel/Dockerfile .
docker build -t your-registry/zetnet-solutions:1.0.0 -f services/solutions/Dockerfile .
docker build -t your-registry/zetnet-enquiry:1.0.0 -f services/enquiry/Dockerfile .
docker build -t your-registry/zetnet-notification:1.0.0 -f services/notification/Dockerfile .
```

## Step 2: Push Images to Registry

### Docker Hub
```bash
docker login
docker push your-registry/zetnet-gateway:1.0.0
docker push your-registry/zetnet-auth:1.0.0
docker push your-registry/zetnet-computer:1.0.0
docker push your-registry/zetnet-travel:1.0.0
docker push your-registry/zetnet-solutions:1.0.0
docker push your-registry/zetnet-enquiry:1.0.0
docker push your-registry/zetnet-notification:1.0.0
```

### AWS ECR
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com
docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/zetnet-gateway:1.0.0
# ... repeat for all services
```

## Step 3: Update Kubernetes Manifests

Edit the following files and replace `YOUR_REGISTRY` with your actual registry:

- `infra/kubernetes/gateway.yaml`
- `infra/kubernetes/auth.yaml`
- `infra/kubernetes/computer.yaml`
- `infra/kubernetes/services.yaml`

Example:
```yaml
image: your-dockerhub-username/zetnet-gateway:latest
# or
image: 123456789.dkr.ecr.us-east-1.amazonaws.com/zetnet-gateway:latest
```

## Step 4: Update Secrets

Edit `infra/kubernetes/secrets.yaml` with your actual credentials:

```yaml
stringData:
  SUPABASE_URL: "https://your-project.supabase.co"
  SUPABASE_SERVICE_ROLE_KEY: "your-actual-key"
  JWT_SECRET: "your-jwt-secret"
  JWT_REFRESH_SECRET: "your-refresh-secret"
  TWILIO_ACCOUNT_SID: "your-twilio-sid"
  TWILIO_AUTH_TOKEN: "your-twilio-token"
  TWILIO_WHATSAPP_FROM: "whatsapp:+1234567890"
  ADMIN_WHATSAPP_NUMBER: "whatsapp:+1234567890"
```

## Step 5: Deploy to Kubernetes

```bash
# Create namespace
kubectl apply -f infra/kubernetes/namespace.yaml

# Create ConfigMap and Secrets
kubectl apply -f infra/kubernetes/configmap.yaml
kubectl apply -f infra/kubernetes/secrets.yaml

# Deploy services
kubectl apply -f infra/kubernetes/auth.yaml
kubectl apply -f infra/kubernetes/computer.yaml
kubectl apply -f infra/kubernetes/services.yaml
kubectl apply -f infra/kubernetes/gateway.yaml

# Verify deployments
kubectl get pods -n zetnet
kubectl get services -n zetnet
```

## Step 6: Access the Application

### Get Gateway Service External IP
```bash
kubectl get service gateway-service -n zetnet
```

Wait for `EXTERNAL-IP` to be assigned (may take a few minutes).

### Test the API
```bash
curl http://<EXTERNAL-IP>/api/health
```

## Monitoring & Debugging

### View Logs
```bash
# Gateway logs
kubectl logs -f deployment/gateway -n zetnet

# Auth service logs
kubectl logs -f deployment/auth -n zetnet

# All pods
kubectl logs -f -l app=gateway -n zetnet
```

### Check Pod Status
```bash
kubectl get pods -n zetnet
kubectl describe pod <pod-name> -n zetnet
```

### Scale Services
```bash
kubectl scale deployment gateway --replicas=3 -n zetnet
```

### Update Deployment
```bash
# After building new image
kubectl set image deployment/gateway gateway=your-registry/zetnet-gateway:1.0.1 -n zetnet
kubectl rollout status deployment/gateway -n zetnet
```

## Local Testing with Minikube

```bash
# Start minikube
minikube start

# Enable ingress
minikube addons enable ingress

# Deploy
kubectl apply -f infra/kubernetes/

# Get service URL
minikube service gateway-service -n zetnet --url
```

## Clean Up

```bash
# Delete all resources
kubectl delete namespace zetnet

# Or delete individually
kubectl delete -f infra/kubernetes/
```

## Production Considerations

1. **Use Ingress Controller** instead of LoadBalancer for cost efficiency
2. **Add HPA (Horizontal Pod Autoscaler)** for auto-scaling
3. **Set up monitoring** with Prometheus/Grafana
4. **Configure persistent volumes** if needed
5. **Use Helm charts** for easier management
6. **Set resource limits** appropriately
7. **Enable RBAC** for security
8. **Use network policies** for service isolation
9. **Set up CI/CD pipeline** for automated deployments
10. **Configure backup strategy** for data

## Troubleshooting

### Pods not starting
```bash
kubectl describe pod <pod-name> -n zetnet
kubectl logs <pod-name> -n zetnet
```

### ImagePullBackOff error
- Verify image name and tag
- Check registry credentials
- Ensure image exists in registry

### CrashLoopBackOff
- Check application logs
- Verify environment variables
- Check database connectivity

### Service not accessible
- Verify service selector matches pod labels
- Check network policies
- Verify LoadBalancer provisioning
