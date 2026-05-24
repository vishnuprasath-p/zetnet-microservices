# Manual Deployment Script for Kubeadm Cluster
# Run this from your local machine with kubectl configured

# Configuration
$DOCKER_REGISTRY = "vishnuprasath"  # Change to your Docker Hub username
$VERSION = "1.0.0"

Write-Host "🚀 Deploying Zetnet Microservices to Kubernetes" -ForegroundColor Green
Write-Host ""

# Step 1: Verify kubectl connection
Write-Host "📡 Checking cluster connection..." -ForegroundColor Yellow
kubectl cluster-info
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Cannot connect to cluster. Check your kubeconfig!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Connected to cluster" -ForegroundColor Green
Write-Host ""

# Step 2: Create namespace
Write-Host "📦 Creating namespace..." -ForegroundColor Yellow
kubectl create namespace zetnet --dry-run=client -o yaml | kubectl apply -f -
Write-Host "✅ Namespace ready" -ForegroundColor Green
Write-Host ""

# Step 3: Create ConfigMap
Write-Host "⚙️  Creating ConfigMap..." -ForegroundColor Yellow
kubectl apply -f infra/kubernetes/configmap.yaml
Write-Host "✅ ConfigMap created" -ForegroundColor Green
Write-Host ""

# Step 4: Create Secrets
Write-Host "🔐 Creating Secrets..." -ForegroundColor Yellow
Write-Host "⚠️  Make sure to update infra/kubernetes/secrets.yaml with your actual values!" -ForegroundColor Red
$continue = Read-Host "Have you updated secrets.yaml? (yes/no)"
if ($continue -ne "yes") {
    Write-Host "❌ Please update secrets.yaml first, then run this script again" -ForegroundColor Red
    exit 1
}
kubectl apply -f infra/kubernetes/secrets.yaml
Write-Host "✅ Secrets created" -ForegroundColor Green
Write-Host ""

# Step 5: Update image registry in manifests
Write-Host "🔧 Updating image registry in manifests..." -ForegroundColor Yellow
$files = @(
    "infra/kubernetes/gateway.yaml",
    "infra/kubernetes/auth.yaml",
    "infra/kubernetes/computer.yaml",
    "infra/kubernetes/services.yaml"
)

foreach ($file in $files) {
    (Get-Content $file) -replace 'YOUR_REGISTRY', $DOCKER_REGISTRY | Set-Content $file
}
Write-Host "✅ Manifests updated" -ForegroundColor Green
Write-Host ""

# Step 6: Deploy services
Write-Host "🚀 Deploying services..." -ForegroundColor Yellow

Write-Host "  → Deploying Auth Service..." -ForegroundColor Cyan
kubectl apply -f infra/kubernetes/auth.yaml

Write-Host "  → Deploying Computer Service..." -ForegroundColor Cyan
kubectl apply -f infra/kubernetes/computer.yaml

Write-Host "  → Deploying Travel, Solutions, Enquiry, Notification Services..." -ForegroundColor Cyan
kubectl apply -f infra/kubernetes/services.yaml

Write-Host "  → Deploying Gateway..." -ForegroundColor Cyan
kubectl apply -f infra/kubernetes/gateway.yaml

Write-Host "✅ All services deployed" -ForegroundColor Green
Write-Host ""

# Step 7: Wait for deployments
Write-Host "⏳ Waiting for deployments to be ready..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray
Write-Host ""

$deployments = @("auth", "computer", "travel", "solutions", "enquiry", "notification", "gateway")
foreach ($deployment in $deployments) {
    Write-Host "  → Waiting for $deployment..." -ForegroundColor Cyan
    kubectl rollout status deployment/$deployment -n zetnet --timeout=5m
}

Write-Host ""
Write-Host "✅ All deployments ready!" -ForegroundColor Green
Write-Host ""

# Step 8: Show status
Write-Host "📊 Deployment Status:" -ForegroundColor Yellow
Write-Host ""
Write-Host "=== Pods ===" -ForegroundColor Cyan
kubectl get pods -n zetnet
Write-Host ""
Write-Host "=== Services ===" -ForegroundColor Cyan
kubectl get services -n zetnet
Write-Host ""

# Step 9: Get Gateway URL
Write-Host "🌐 Gateway Service:" -ForegroundColor Yellow
$gatewayIP = kubectl get service gateway-service -n zetnet -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
if ($gatewayIP) {
    Write-Host "✅ Gateway URL: http://$gatewayIP" -ForegroundColor Green
} else {
    Write-Host "⚠️  LoadBalancer IP pending... Run this to check:" -ForegroundColor Yellow
    Write-Host "   kubectl get service gateway-service -n zetnet" -ForegroundColor Gray
}
Write-Host ""

Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Test the API: curl http://$gatewayIP/health" -ForegroundColor Gray
Write-Host "2. View logs: kubectl logs -f deployment/gateway -n zetnet" -ForegroundColor Gray
Write-Host "3. Monitor pods: kubectl get pods -n zetnet -w" -ForegroundColor Gray
