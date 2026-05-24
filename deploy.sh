#!/bin/bash

# Manual Deployment Script for Kubeadm Cluster
# Run this from your local machine with kubectl configured

# Configuration
DOCKER_REGISTRY="vishnuprasath"  # Change to your Docker Hub username
VERSION="1.0.0"

echo "🚀 Deploying Zetnet Microservices to Kubernetes"
echo ""

# Step 1: Verify kubectl connection
echo "📡 Checking cluster connection..."
kubectl cluster-info
if [ $? -ne 0 ]; then
    echo "❌ Cannot connect to cluster. Check your kubeconfig!"
    exit 1
fi
echo "✅ Connected to cluster"
echo ""

# Step 2: Create namespace
echo "📦 Creating namespace..."
kubectl create namespace zetnet --dry-run=client -o yaml | kubectl apply -f -
echo "✅ Namespace ready"
echo ""

# Step 3: Create ConfigMap
echo "⚙️  Creating ConfigMap..."
kubectl apply -f infra/kubernetes/configmap.yaml
echo "✅ ConfigMap created"
echo ""

# Step 4: Create Secrets
echo "🔐 Creating Secrets..."
echo "⚠️  Make sure to update infra/kubernetes/secrets.yaml with your actual values!"
read -p "Have you updated secrets.yaml? (yes/no): " continue
if [ "$continue" != "yes" ]; then
    echo "❌ Please update secrets.yaml first, then run this script again"
    exit 1
fi
kubectl apply -f infra/kubernetes/secrets.yaml
echo "✅ Secrets created"
echo ""

# Step 5: Update image registry in manifests
echo "🔧 Updating image registry in manifests..."
sed -i "s|YOUR_REGISTRY|$DOCKER_REGISTRY|g" infra/kubernetes/gateway.yaml
sed -i "s|YOUR_REGISTRY|$DOCKER_REGISTRY|g" infra/kubernetes/auth.yaml
sed -i "s|YOUR_REGISTRY|$DOCKER_REGISTRY|g" infra/kubernetes/computer.yaml
sed -i "s|YOUR_REGISTRY|$DOCKER_REGISTRY|g" infra/kubernetes/services.yaml
echo "✅ Manifests updated"
echo ""

# Step 6: Deploy services
echo "🚀 Deploying services..."

echo "  → Deploying Auth Service..."
kubectl apply -f infra/kubernetes/auth.yaml

echo "  → Deploying Computer Service..."
kubectl apply -f infra/kubernetes/computer.yaml

echo "  → Deploying Travel, Solutions, Enquiry, Notification Services..."
kubectl apply -f infra/kubernetes/services.yaml

echo "  → Deploying Gateway..."
kubectl apply -f infra/kubernetes/gateway.yaml

echo "✅ All services deployed"
echo ""

# Step 7: Wait for deployments
echo "⏳ Waiting for deployments to be ready..."
echo "This may take a few minutes..."
echo ""

deployments=("auth" "computer" "travel" "solutions" "enquiry" "notification" "gateway")
for deployment in "${deployments[@]}"; do
    echo "  → Waiting for $deployment..."
    kubectl rollout status deployment/$deployment -n zetnet --timeout=5m
done

echo ""
echo "✅ All deployments ready!"
echo ""

# Step 8: Show status
echo "📊 Deployment Status:"
echo ""
echo "=== Pods ==="
kubectl get pods -n zetnet
echo ""
echo "=== Services ==="
kubectl get services -n zetnet
echo ""

# Step 9: Get Gateway URL
echo "🌐 Gateway Service:"
GATEWAY_IP=$(kubectl get service gateway-service -n zetnet -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
if [ -n "$GATEWAY_IP" ]; then
    echo "✅ Gateway URL: http://$GATEWAY_IP"
else
    echo "⚠️  LoadBalancer IP pending... Run this to check:"
    echo "   kubectl get service gateway-service -n zetnet"
fi
echo ""

echo "🎉 Deployment Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Test the API: curl http://$GATEWAY_IP/health"
echo "2. View logs: kubectl logs -f deployment/gateway -n zetnet"
echo "3. Monitor pods: kubectl get pods -n zetnet -w"
