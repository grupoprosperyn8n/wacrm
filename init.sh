#!/usr/bin/env bash
# init.sh — Pre-flight verification for wacrm
# Run this before any coding session. If it fails, STOP and report.
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== wacrm pre-flight check ==="
echo ""

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 node_modules not found. Running npm install...${NC}"
    npm install
    echo ""
fi

echo -e "${YELLOW}🔍 TypeScript check...${NC}"
if npm run typecheck 2>/dev/null; then
    echo -e "${GREEN}✅ typecheck passed${NC}"
else
    echo -e "${RED}❌ typecheck FAILED${NC}"
    echo "Fix type errors before proceeding."
    exit 1
fi
echo ""

echo -e "${YELLOW}🔍 Lint check...${NC}"
if npm run lint 2>/dev/null; then
    echo -e "${GREEN}✅ lint passed${NC}"
else
    echo -e "${RED}❌ lint FAILED${NC}"
    echo "Fix lint errors before proceeding."
    exit 1
fi
echo ""

echo -e "${YELLOW}🔍 Tests...${NC}"
if npm run test 2>/dev/null; then
    echo -e "${GREEN}✅ tests passed${NC}"
else
    echo -e "${RED}❌ tests FAILED${NC}"
    echo "Fix test failures before proceeding."
    exit 1
fi
echo ""

echo -e "${GREEN}✅ All pre-flight checks passed. Project is healthy.${NC}"
