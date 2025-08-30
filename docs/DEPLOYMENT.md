# Deployment Guide - Vishnu's Finance

This guide will help you deploy Vishnu's Finance to production.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MySQL 8.0+ database
- Git
- A hosting provider (Vercel, Railway, DigitalOcean, etc.)

## 📋 Local Development Setup

1. **Clone and Install**
   ```bash
   git clone <your-repo-url>
   cd vishnu-finance
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   ```
   
   Update `.env.local` with your database credentials:
   ```env
   DATABASE_URL="mysql://username:password@localhost:3306/vishnu_finance"
   ```

3. **Database Setup**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   
   # Run setup script to create default data
   npm run setup
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Access Application**
   Open [http://localhost:3000](http://localhost:3000)

## 🌐 Production Deployment

### Option 1: Vercel (Recommended)

1. **Prepare for Deployment**
   ```bash
   # Build the application
   npm run build
   ```

2. **Deploy to Vercel**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel
   ```

3. **Environment Variables**
   In Vercel dashboard, add these environment variables:
   - `DATABASE_URL`: Your production MySQL connection string
   - `NEXTAUTH_SECRET`: A secure random string
   - `NEXTAUTH_URL`: Your production URL

### Option 2: Railway

1. **Connect Repository**
   - Connect your GitHub repository to Railway
   - Railway will automatically detect Next.js

2. **Environment Variables**
   Add the same environment variables as above in Railway dashboard

3. **Database**
   - Create a MySQL database in Railway
   - Use the provided connection string for `DATABASE_URL`

### Option 3: DigitalOcean App Platform

1. **Create App**
   - Connect your GitHub repository
   - Select Node.js as the environment

2. **Environment Variables**
   Add the required environment variables

3. **Database**
   - Create a managed MySQL database
   - Use the connection string for `DATABASE_URL`

### Option 4: Self-Hosted VPS

1. **Server Setup**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install MySQL
   sudo apt install mysql-server -y
   ```

2. **Database Setup**
   ```bash
   sudo mysql_secure_installation
   sudo mysql -u root -p
   ```
   
   ```sql
   CREATE DATABASE vishnu_finance;
   CREATE USER 'vishnu_user'@'localhost' IDENTIFIED BY 'your_secure_password';
   GRANT ALL PRIVILEGES ON vishnu_finance.* TO 'vishnu_user'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

3. **Application Deployment**
   ```bash
   # Clone repository
   git clone <your-repo-url>
   cd vishnu-finance
   
   # Install dependencies
   npm install
   
   # Build application
   npm run build
   
   # Set up environment
   cp .env.example .env.local
   # Edit .env.local with your database credentials
   
   # Set up database
   npm run db:generate
   npm run db:push
   npm run setup
   
   # Start application
   npm start
   ```

4. **Process Manager (PM2)**
   ```bash
   # Install PM2
   npm install -g pm2
   
   # Start application with PM2
   pm2 start npm --name "vishnu-finance" -- start
   
   # Save PM2 configuration
   pm2 save
   pm2 startup
   ```

5. **Nginx Configuration**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## 🔒 Security Considerations

### Environment Variables
- Never commit `.env` files to version control
- Use strong, unique passwords for database
- Rotate secrets regularly

### Database Security
- Use SSL connections for database
- Restrict database access to application server only
- Regular database backups

### Application Security
- Keep dependencies updated
- Use HTTPS in production
- Implement rate limiting
- Regular security audits

## 📊 Monitoring & Maintenance

### Health Checks
- Set up health check endpoints
- Monitor application performance
- Set up error tracking (Sentry, LogRocket)

### Backups
- Regular database backups
- Application code backups
- Environment configuration backups

### Updates
- Regular dependency updates
- Security patches
- Feature updates

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify `DATABASE_URL` format
   - Check database server is running
   - Verify network connectivity

2. **Build Errors**
   - Clear `.next` folder: `rm -rf .next`
   - Reinstall dependencies: `rm -rf node_modules && npm install`

3. **Environment Variables**
   - Verify all required variables are set
   - Check variable names match exactly
   - Restart application after changes

### Logs
```bash
# Vercel
vercel logs

# Railway
railway logs

# PM2
pm2 logs vishnu-finance

# Docker
docker logs <container-name>
```

## 📈 Performance Optimization

### Database
- Add indexes for frequently queried fields
- Optimize queries
- Use connection pooling

### Application
- Enable Next.js optimizations
- Use CDN for static assets
- Implement caching strategies

### Monitoring
- Set up performance monitoring
- Track key metrics
- Optimize based on usage patterns

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build application
        run: npm run build
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

## 📞 Support

For deployment issues:
1. Check the troubleshooting section
2. Review logs for error messages
3. Verify environment configuration
4. Test locally before deploying

## 🎯 Next Steps

After successful deployment:
1. Set up monitoring and alerts
2. Configure backups
3. Set up SSL certificates
4. Implement user authentication
5. Add advanced features from the roadmap