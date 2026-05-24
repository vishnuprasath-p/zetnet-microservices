# Getting KUBE_CONFIG from Kubeadm Cluster

## Method 1: Quick - Use Admin Config (Less Secure)

### Step 1: SSH to Master Node
```bash
gcloud compute ssh your-master-vm-name --zone=your-zone
```

### Step 2: Get Admin Config
```bash
sudo cat /etc/kubernetes/admin.conf
```

### Step 3: Encode to Base64

**On the master node (Linux):**
```bash
sudo cat /etc/kubernetes/admin.conf | base64 -w 0
```

**Or copy the file to your Windows machine and encode:**
```powershell
# Copy file from GCP VM to local
gcloud compute scp your-master-vm:/etc/kubernetes/admin.conf C:\temp\kubeconfig --zone=your-zone

# Encode it
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content C:\temp\kubeconfig -Raw)))
```

### Step 4: Add to GitHub Secrets
Copy the base64 output and add as `KUBE_CONFIG` secret.

---

## Method 2: Secure - Create Service Account (Recommended)

### Step 1: Upload Script to Master Node
```bash
# From your local machine
gcloud compute scp infra/kubernetes/create-github-sa.sh your-master-vm:~/ --zone=your-zone
```

### Step 2: SSH to Master Node
```bash
gcloud compute ssh your-master-vm-name --zone=your-zone
```

### Step 3: Run the Script
```bash
chmod +x create-github-sa.sh
./create-github-sa.sh
```

### Step 4: Copy the Base64 Output
The script will output a base64 encoded kubeconfig. Copy it.

### Step 5: Add to GitHub Secrets
Add the copied base64 string as `KUBE_CONFIG` secret in GitHub.

---

## Method 3: Manual Service Account Creation

### Step 1: SSH to Master Node
```bash
gcloud compute ssh your-master-vm-name --zone=your-zone
```

### Step 2: Create Service Account
```bash
kubectl create namespace zetnet
kubectl create serviceaccount github-actions -n zetnet
```

### Step 3: Create RBAC
```bash
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: github-actions-admin
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: github-actions
  namespace: zetnet
EOF
```

### Step 4: Get Token (Kubernetes 1.24+)
```bash
kubectl create token github-actions -n zetnet --duration=87600h
```

Save this token.

### Step 5: Get Cluster Info
```bash
# Get server URL
kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}'

# Get CA certificate
kubectl config view --raw -o jsonpath='{.clusters[0].cluster.certificate-authority-data}'
```

### Step 6: Create Kubeconfig File
```bash
cat > github-kubeconfig.yaml <<EOF
apiVersion: v1
kind: Config
clusters:
- cluster:
    certificate-authority-data: <PASTE_CA_CERT_HERE>
    server: <PASTE_SERVER_URL_HERE>
  name: kubernetes
contexts:
- context:
    cluster: kubernetes
    namespace: zetnet
    user: github-actions
  name: github-actions
current-context: github-actions
users:
- name: github-actions
  user:
    token: <PASTE_TOKEN_HERE>
EOF
```

### Step 7: Encode to Base64
```bash
cat github-kubeconfig.yaml | base64 -w 0
```

---

## Important: Update Cluster Server URL

If your cluster's API server is only accessible via internal IP, you need to:

### Option A: Expose API Server Publicly (Not Recommended)
```bash
# Add firewall rule in GCP
gcloud compute firewall-rules create k8s-api-server \
  --allow tcp:6443 \
  --source-ranges 0.0.0.0/0 \
  --target-tags k8s-master
```

### Option B: Use GitHub Self-Hosted Runner (Recommended)
Deploy a GitHub Actions runner inside your GCP VPC that can access the cluster.

### Option C: Use VPN/Bastion
Set up a VPN or bastion host for GitHub Actions to connect through.

---

## Verify the Config Works

### Test Locally First
```bash
# Save the kubeconfig
echo "<base64_string>" | base64 -d > test-kubeconfig.yaml

# Test it
export KUBECONFIG=test-kubeconfig.yaml
kubectl cluster-info
kubectl get nodes
```

If these work, the config is valid!

---

## Troubleshooting

### Error: "Unable to connect to server"
- Check if API server is accessible from internet
- Verify firewall rules allow port 6443
- Check if server URL in kubeconfig is correct (use external IP)

### Error: "Unauthorized"
- Verify service account has correct permissions
- Check token is valid
- Ensure RBAC binding is created

### Error: "x509: certificate signed by unknown authority"
- Verify certificate-authority-data is correct
- Check CA certificate is properly base64 encoded

---

## Security Best Practices

1. ✅ Use service account instead of admin.conf
2. ✅ Limit service account permissions (don't use cluster-admin)
3. ✅ Set token expiration
4. ✅ Rotate tokens regularly
5. ✅ Use GitHub environment secrets for production
6. ✅ Enable audit logging on cluster
7. ✅ Restrict API server access by IP if possible

---

## Quick Commands Reference

```bash
# Get your master node external IP
gcloud compute instances list | grep master

# SSH to master
gcloud compute ssh <master-vm-name> --zone=<zone>

# Check kubectl works
kubectl get nodes

# Get admin config
sudo cat /etc/kubernetes/admin.conf | base64 -w 0

# Test connection
kubectl --kubeconfig=/path/to/config cluster-info
```
