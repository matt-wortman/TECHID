# Troubleshooting Guide

Common issues and their solutions for the Tech Triage Platform.

## Database Connection Issues

### "fetch failed" or "Cannot fetch data from service"

**Symptom:**
```
Error: P5010
Cannot fetch data from service: fetch failed
```

**Cause:** The Prisma local database proxy is not running.

**Solution:**
```bash
# Start the database proxy in a separate terminal
npx prisma dev

# Then start the dev server
npm run dev
```

The project uses Prisma Platform's local development setup (`prisma+postgres://` protocol). The `npx prisma dev` command starts a local proxy on port 51213 that connects to PostgreSQL on port 51214.

---

### "Can't reach database server at localhost:51214"

**Symptom:**
```
Error: P1001
Can't reach database server at `localhost:51214`
```

**Cause:** PostgreSQL is not running on port 51214.

**Solution:**
1. Ensure your local PostgreSQL instance is running
2. Check that it's listening on port 51214
3. Verify connection settings in `.env.prisma-dev`

---

### "The table `public.xxx` does not exist"

**Symptom:**
```
Error: P2021
The table `public.question_responses` does not exist in the current database.
```

**Cause:** Stale Prisma client cache after schema changes or migrations.

**Solution:**
```bash
# Clear Next.js cache
rm -rf .next

# Clear Prisma client cache
rm -rf node_modules/.prisma

# Regenerate Prisma client
npx prisma generate

# Restart dev server
npm run dev
```

---

## Prisma Studio Issues

### "EADDRINUSE: address already in use :::5555"

**Symptom:**
```
Error: listen EADDRINUSE: address already in use :::5555
```

**Cause:** Another Prisma Studio instance is already running on that port.

**Solution:**
```bash
# Find and kill the existing process
lsof -i :5555
kill -9 <PID>

# Or use a different port
npx prisma studio --port 5556
```

---

## Form Issues

### Form not loading / "No form template found"

**Possible causes:**
1. No active form template in database
2. Database not seeded

**Solution:**
```bash
# Seed the database
npm run db:seed:dev
```

---

### Draft not saving

**Possible causes:**
1. Database connection lost
2. Missing `technologyId` in form

**Solution:**
1. Check that `npx prisma dev` is still running
2. Ensure a Technology record exists for the form
3. Check browser console for specific error messages

---

### Answers not persisting across forms

**Cause:** Answers should be keyed by `(techId + questionKey)`. If different forms use different keys for the same data, answers won't be shared.

**Solution:**
1. Check the Question Dictionary for consistent key mapping
2. Verify both forms use the same dictionary keys

---

## Build Issues

### TypeScript errors after schema changes

**Solution:**
```bash
# Regenerate Prisma client
npx prisma generate

# Then run type check
npm run type-check
```

---

### "Module not found" errors

**Solution:**
```bash
# Clear caches and reinstall
rm -rf .next node_modules
npm install
npx prisma generate
```

---

## Testing Issues

### Tests failing with database errors

**Cause:** Tests may be trying to connect to a real database.

**Solution:**
- Unit tests should mock Prisma client
- Integration tests need `npm run test:integration` with test database

---

### Jest "Cannot find module" errors

**Solution:**
```bash
# Clear Jest cache
npx jest --clearCache

# Run tests again
npm test
```

---

## Migration Issues

### "Prisma Migrate has detected that the environment is non-interactive"

**Symptom:** Running `npx prisma migrate dev` fails in certain terminals.

**Solution:**
```bash
# Use script to emulate TTY
script -q -c "npx dotenv -e .env.prisma-dev -- npx prisma migrate dev --name migration-name" /dev/null <<< "y"
```

---

### Migration conflicts

**Symptom:** Prisma reports migration history conflicts.

**Solution:**
1. Review the conflict carefully
2. If safe, reset migrations: `npx prisma migrate reset`
3. Or manually resolve in `prisma/migrations/`

---

## Environment Issues

### Wrong database being used

**Symptom:** Changes not appearing, or seeing production data in development.

**Cause:** Using wrong `.env` file.

**Solution:**
```bash
# Development should use .env.prisma-dev
npm run dev  # Uses .env.prisma-dev automatically

# Verify which env file is being used
echo $DATABASE_URL
```

---

## Getting More Help

1. Check the [TECHNICAL-MANUAL.md](../TECHNICAL-MANUAL.md) for detailed explanations
2. Check browser console for JavaScript errors
3. Check terminal for server-side errors
4. Check PostgreSQL logs if database issues persist

---

## Reporting Issues

When reporting issues, include:
1. Error message (full text)
2. Steps to reproduce
3. Terminal output from both `npx prisma dev` and `npm run dev`
4. Browser console errors (if applicable)
