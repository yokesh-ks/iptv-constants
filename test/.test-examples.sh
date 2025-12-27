#!/bin/bash

# Quick Test Examples
# Run these commands to test different channels

echo "🧪 Single Channel Language Detection Test Examples"
echo "=================================================="
echo ""

echo "1. Test by channel name (searches data/in.json):"
echo "   node test/test-single-channel.js \"7s music\""
echo "   node test/test-single-channel.js \"sun tv\""
echo "   node test/test-single-channel.js \"zee tv\""
echo ""

echo "2. Test by domain:"
echo "   node test/test-single-channel.js --domain 7SMusic.in"
echo "   node test/test-single-channel.js --domain suntv.in"
echo ""

echo "3. Test by tvgId:"
echo "   node test/test-single-channel.js --tvg-id \"7SMusic.in@SD\""
echo ""

echo "4. Skip web detection (pattern only):"
echo "   node test/test-single-channel.js --skip-web \"sun tv\""
echo ""

echo "5. Get help:"
echo "   node test/test-single-channel.js --help"
echo ""

echo "=================================================="
echo ""

# Uncomment to run a quick test
# node test/test-single-channel.js "7s music"
