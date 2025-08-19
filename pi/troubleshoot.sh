#!/bin/bash

# Finance Tracker Troubleshooting Script
# Run this on your Pi to diagnose connection issues

echo "🔍 Finance Tracker - Connection Troubleshooting"
echo "============================================="

# Check if app is running
echo "1. Checking if Next.js app is running..."
if pgrep -f "next" > /dev/null; then
    echo "✅ Next.js app is running"
    echo "Process details:"
    ps aux | grep next | grep -v grep
else
    echo "❌ Next.js app is NOT running"
    echo "Try: cd ~/finance-tracker && npm run dev"
fi

echo ""

# Check if port 3000 is listening
echo "2. Checking if port 3000 is open..."
if netstat -tuln | grep :3000 > /dev/null; then
    echo "✅ Port 3000 is listening"
    netstat -tuln | grep :3000
else
    echo "❌ Port 3000 is NOT listening"
fi

echo ""

# Check Nginx status
echo "3. Checking Nginx status..."
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx is NOT running"
    echo "Try: sudo systemctl start nginx"
fi

echo ""

# Check Nginx configuration
echo "4. Testing Nginx configuration..."
if sudo nginx -t > /dev/null 2>&1; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration has errors:"
    sudo nginx -t
fi

echo ""

# Check if Nginx is listening on port 80
echo "5. Checking if Nginx is listening on ports 80 and 443..."
if netstat -tuln | grep :80 > /dev/null; then
    echo "✅ Port 80 is listening"
    netstat -tuln | grep :80
else
    echo "❌ Port 80 is NOT listening"
fi

if netstat -tuln | grep :443 > /dev/null; then
    echo "✅ Port 443 is listening"
    netstat -tuln | grep :443
else
    echo "❌ Port 443 is NOT listening"
fi

echo ""

# Show IP addresses
echo "6. Network information..."
echo "Local IP addresses:"
hostname -I

echo ""

# Test local connection
echo "7. Testing local connections..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Direct connection to app works"
else
    echo "❌ Direct connection to app failed"
fi

if curl -s -k https://localhost > /dev/null; then
    echo "✅ HTTPS connection through nginx works"
else
    echo "❌ HTTPS connection through nginx failed"
fi

if curl -s http://localhost > /dev/null; then
    echo "✅ HTTP connection (should redirect to HTTPS)"
else
    echo "❌ HTTP connection failed"
fi

echo ""

# Show recent Nginx logs
echo "8. Recent Nginx error logs (if any)..."
sudo tail -5 /var/log/nginx/error.log 2>/dev/null || echo "No recent errors found"

echo ""
echo "============================================="
echo "🔧 Quick fixes to try:"
echo "1. Restart the app: cd ~/finance-tracker && npm run dev"
echo "2. Restart Nginx: sudo systemctl restart nginx"
echo "3. Check firewall: sudo ufw status"
echo "4. Update Nginx config: sudo cp ~/finance-tracker/pi/nginx-config-manual.conf /etc/nginx/sites-available/finance-tracker"
