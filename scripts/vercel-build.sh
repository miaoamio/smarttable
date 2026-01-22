#!/bin/bash
set -e
echo "Starting Vercel Build..."
# Ensure we are in root
cd "$(dirname "$0")/.."
ROOT_DIR=$(pwd)
echo "Root: $ROOT_DIR"

echo "Listing node_modules/.bin"
ls -la node_modules/.bin || echo "node_modules/.bin not found"

build_package() {
    PKG_DIR=$1
    echo "Building $PKG_DIR..."
    cd "$ROOT_DIR/$PKG_DIR"
    
    # Try multiple ways to run tsc
    if [ -f "../../node_modules/.bin/tsc" ]; then
        echo "Using local tsc"
        ../../node_modules/.bin/tsc
    elif [ -f "$ROOT_DIR/node_modules/.bin/tsc" ]; then
        echo "Using root tsc"
        "$ROOT_DIR/node_modules/.bin/tsc"
    else
        echo "Using npx tsc"
        npx tsc
    fi
}

build_package "packages/mcp-server"
build_package "packages/mcp-gateway"

echo "Build Done"
