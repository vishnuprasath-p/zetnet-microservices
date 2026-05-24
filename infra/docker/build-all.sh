#!/bin/bash

# Docker Registry (change this to your registry)
REGISTRY="your-docker-registry"
VERSION="1.0.0"

echo "Building Docker images for Zetnet microservices..."

# Build Gateway
echo "Building Gateway..."
docker build -t $REGISTRY/zetnet-gateway:$VERSION -f gateway/Dockerfile .
docker tag $REGISTRY/zetnet-gateway:$VERSION $REGISTRY/zetnet-gateway:latest

# Build Auth Service
echo "Building Auth Service..."
docker build -t $REGISTRY/zetnet-auth:$VERSION -f services/auth/Dockerfile .
docker tag $REGISTRY/zetnet-auth:$VERSION $REGISTRY/zetnet-auth:latest

# Build Computer Service
echo "Building Computer Service..."
docker build -t $REGISTRY/zetnet-computer:$VERSION -f services/computer/Dockerfile .
docker tag $REGISTRY/zetnet-computer:$VERSION $REGISTRY/zetnet-computer:latest

# Build Travel Service
echo "Building Travel Service..."
docker build -t $REGISTRY/zetnet-travel:$VERSION -f services/travel/Dockerfile .
docker tag $REGISTRY/zetnet-travel:$VERSION $REGISTRY/zetnet-travel:latest

# Build Solutions Service
echo "Building Solutions Service..."
docker build -t $REGISTRY/zetnet-solutions:$VERSION -f services/solutions/Dockerfile .
docker tag $REGISTRY/zetnet-solutions:$VERSION $REGISTRY/zetnet-solutions:latest

# Build Enquiry Service
echo "Building Enquiry Service..."
docker build -t $REGISTRY/zetnet-enquiry:$VERSION -f services/enquiry/Dockerfile .
docker tag $REGISTRY/zetnet-enquiry:$VERSION $REGISTRY/zetnet-enquiry:latest

# Build Notification Service
echo "Building Notification Service..."
docker build -t $REGISTRY/zetnet-notification:$VERSION -f services/notification/Dockerfile .
docker tag $REGISTRY/zetnet-notification:$VERSION $REGISTRY/zetnet-notification:latest

echo "All images built successfully!"

# Push to registry (uncomment when ready)
# echo "Pushing images to registry..."
# docker push $REGISTRY/zetnet-gateway:$VERSION
# docker push $REGISTRY/zetnet-gateway:latest
# docker push $REGISTRY/zetnet-auth:$VERSION
# docker push $REGISTRY/zetnet-auth:latest
# docker push $REGISTRY/zetnet-computer:$VERSION
# docker push $REGISTRY/zetnet-computer:latest
# docker push $REGISTRY/zetnet-travel:$VERSION
# docker push $REGISTRY/zetnet-travel:latest
# docker push $REGISTRY/zetnet-solutions:$VERSION
# docker push $REGISTRY/zetnet-solutions:latest
# docker push $REGISTRY/zetnet-enquiry:$VERSION
# docker push $REGISTRY/zetnet-enquiry:latest
# docker push $REGISTRY/zetnet-notification:$VERSION
# docker push $REGISTRY/zetnet-notification:latest

echo "Done!"
