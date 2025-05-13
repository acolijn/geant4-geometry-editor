#!/bin/bash

# Generate API documentation from JSDoc comments
echo "Generating API documentation..."
npm run docs:api

# Serve the documentation using MkDocs
echo "Starting documentation server..."
mkdocs serve
