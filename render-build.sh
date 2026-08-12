#!/usr/bin/env bash
# exit on error
set -o errexit

# Detect if Node.js is available, download if missing
if ! command -v node &> /dev/null
then
    echo "Node.js not found. Downloading precompiled Linux-x64 Node.js binary..."
    NODE_VERSION="v20.11.0"
    NODE_DIST="node-$NODE_VERSION-linux-x64"
    
    # Download and extract Node.js
    curl -s -O https://nodejs.org/dist/$NODE_VERSION/$NODE_DIST.tar.xz
    tar -xf $NODE_DIST.tar.xz
    
    # Add Node.js to PATH
    export PATH=$PWD/$NODE_DIST/bin:$PATH
    echo "Node.js installed successfully:"
    node -v
fi

# Build React frontend
echo "Installing frontend dependencies..."
cd frontend
npm install
echo "Compiling frontend assets..."
npm run build
cd ..

# Build Go backend
echo "Compiling Go backend monolithic server..."
cd backend
go build -o ../server .
cd ..

# Clean up temporary Node files to keep deployment package small
if [ -d "node-v20.11.0-linux-x64" ]; then
    echo "Cleaning up temporary Node.js files..."
    rm -rf node-v20.11.0-linux-x64 node-v20.11.0-linux-x64.tar.xz
fi

echo "Build complete! Start the application using: ./server"
