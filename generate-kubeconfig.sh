#!/bin/bash
# Run this on your master node to generate kubeconfig with external IP

EXTERNAL_IP="34.10.41.225"

echo "Generating kubeconfig with external IP for GitHub Actions..."

# Get the original config
sudo cat /etc/kubernetes/admin.conf > /tmp/github-kubeconfig.yaml

# Replace internal IP with external IP
sed -i "s|https://10.128.0.33:6443|https://${EXTERNAL_IP}:6443|g" /tmp/github-kubeconfig.yaml

echo ""
echo "✅ Kubeconfig generated at: /tmp/github-kubeconfig.yaml"
echo ""
echo "📋 Copy this base64 encoded config for GitHub Secret KUBE_CONFIG:"
echo ""
cat /tmp/github-kubeconfig.yaml | base64 -w 0
echo ""
echo ""
echo "🔐 Add this as KUBE_CONFIG secret in GitHub"
