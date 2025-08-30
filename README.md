# Vishnu's Finance

A comprehensive personal finance and decision assistant built with Next.js and MySQL, designed for holistic financial management, news-driven decision making, and personal goal tracking.

## 🎯 Project Overview

Vishnu's Finance is a **personal finance web platform** that centralizes financial inflows, outflows, deadlines, savings goals, and integrates external data (news/trends) to help optimize financial decisions. It's designed for individual use with a focus on privacy and personal financial empowerment.

## ✨ Key Features

### Core Financial Management
- **Income Tracking**: Monitor salary, side hustles, passive income, and investments
- **Expense Management**: Categorize and track all expenses with detailed analytics
- **Cash Flow Analysis**: Visual dashboards showing income vs expenses trends
- **Deadline Management**: Track bills, EMIs, subscriptions with smart reminders

### Intelligent Insights
- **News Integration**: Real-time financial news impacting personal finances
- **AI-Driven Prioritization**: Smart suggestions for saving, investing, and spending
- **Financial Health Reports**: Daily/weekly summaries with actionable insights

### Goal Setting & Tracking
- **Bucket List Management**: Set personal financial goals with real-time cost tracking
- **Progress Visualization**: Track savings progress towards goals
- **Timeline Prioritization**: Align savings with deadlines and opportunities

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 14 (React framework) with TypeScript
- **Backend**: Node.js with Express.js API layer
- **Database**: MySQL for data persistence
- **External APIs**: News API, Google News RSS for financial news
- **AI/NLP**: Local lightweight LLM or API-based summarizer
- **Styling**: Tailwind CSS for modern, responsive UI
- **Charts**: Chart.js or Recharts for data visualization

### Project Structure
```
vishnu-finance/
├── src/
│   ├── app/                 # Next.js app router
│   ├── components/          # Reusable UI components
│   ├── lib/                 # Utility functions and configurations
│   ├── types/               # TypeScript type definitions
│   └── api/                 # API routes
├── prisma/                  # Database schema and migrations
├── public/                  # Static assets
└── docs/                    # Documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MySQL 8.0+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vishnu-finance
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```
   Update the `.env.local` file with your database credentials and API keys.

4. **Database Setup**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📊 Database Schema

### Core Tables
- **users**: User profile and preferences
- **income_sources**: Income tracking with categories
- **expenses**: Expense tracking with categorization
- **categories**: Expense and income categories
- **deadlines**: Bills, EMIs, and financial obligations
- **goals**: Personal financial goals and bucket list items
- **news_cache**: Cached financial news and insights
- **financial_reports**: Generated financial health reports

## 🔧 Configuration

### Environment Variables
```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/vishnu_finance"

# News API
NEWS_API_KEY="your_news_api_key"
GOOGLE_NEWS_RSS_URL="https://news.google.com/rss"

# AI/LLM (Optional)
OPENAI_API_KEY="your_openai_api_key"

# Security
JWT_SECRET="your_jwt_secret"
NEXTAUTH_SECRET="your_nextauth_secret"
```

## 📈 Development Roadmap

### Phase 1: MVP (Week 1-2)
- [x] Project setup and basic architecture
- [ ] Database schema and migrations
- [ ] Basic CRUD operations for income/expenses
- [ ] Simple dashboard with charts

### Phase 2: Core Features (Week 3-4)
- [ ] News integration and filtering
- [ ] Deadline management with reminders
- [ ] Enhanced analytics and reporting
- [ ] Goal setting and tracking

### Phase 3: Advanced Features (Week 5-6)
- [ ] AI-powered insights and suggestions
- [ ] Advanced financial health scoring
- [ ] Predictive analytics
- [ ] Mobile responsiveness

## 🤝 Contributing

This is a personal project, but suggestions and improvements are welcome. Please ensure any contributions align with the project's focus on personal finance management.

## 📝 License

This project is for personal use. All rights reserved.

## 🆘 Support

For issues or questions, please create an issue in the repository or contact the maintainer.

---

**Built with ❤️ for better financial decision making**