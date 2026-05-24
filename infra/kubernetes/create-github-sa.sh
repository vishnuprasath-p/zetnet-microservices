#!/bin/bash
# Run this on your Kubernetes master node or where kubectl is configured

echo "Creating service account for GitHub Actions..."

# Create namespace if not exists
kubectl create namespace zetnet --dry-run=client -o yaml | kubectl apply -f -

# Create service account
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: github-actions
  namespace: zetnet
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: github-actions-role
rules:
- apiGroups: [""]
  resources: ["namespaces", "pods", "services", "configmaps", "secrets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets", "statefulsets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: github-actions-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: github-actions-role
subjects:
- kind: ServiceAccount
  name: github-actions
  namespace: zetnet
EOF

echo "Service account created!"
echo ""
echo "Getting token and generating kubeconfig..."

# Get the service account token
SECRET_NAME=$(kubectl get serviceaccount github-actions -n zetnet -o jsonpath='{.secrets[0].name}')

# For Kubernetes 1.24+, create token manually
if [ -z "$SECRET_NAME" ]; then
  echo "Creating token for Kubernetes 1.24+..."
  kubectl create token github-actions -n zetnet --duration=87600h > /tmp/sa-token
  TOKEN=$(cat /tmp/sa-token)
else
  TOKEN=$(kubectl get secret $SECRET_NAME -n zetnet -o jsonpath='{.data.token}' | base64 -d)
fi

# Get cluster info
CLUSTER_NAME=$(kubectl config view -o jsonpath='{.clusters[0].name}')
CLUSTER_SERVER=$(kubectl config view -o jsonpath='{.clusters[0].cluster.server}')
CLUSTER_CA=$(kubectl config view --raw -o jsonpath='{.clusters[0].cluster.certificate-authority-data}')

# Generate kubeconfig
cat > /tmp/github-actions-kubeconfig.yaml <<EOF
apiVersion: v1
kind: Config
clusters:
- cluster:
    certificate-authority-data: ${CLUSTER_CA}
    server: ${CLUSTER_SERVER}
  name: ${CLUSTER_NAME}
contexts:
- context:
    cluster: ${CLUSTER_NAME}
    namespace: zetnet
    user: github-actions
  name: github-actions-context
current-context: github-actions-context
users:
- name: github-actions
  user:
    token: ${TOKEN}
EOF

echo ""
echo "✅ Kubeconfig generated at: /tmp/github-actions-kubeconfig.yaml"
echo ""
echo "📋 Copy this base64 encoded config for GitHub Secret:"
echo ""
cat /tmp/github-actions-kubeconfig.yaml | base64 -w 0
echo ""
echo ""
echo "🔐 Add this as KUBE_CONFIG secret in GitHub"
