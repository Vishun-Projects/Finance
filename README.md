# Vishnu's Finance

A comprehensive personal finance and decision assistant built with Next.js and MySQL, designed for holistic financial management, news-driven decision making, and personal goal tracking.

## 🎯 Project Overview

Vishnu's Finance is a **personal finance web platform** that centralizes financial inflows, outflows, deadlines, savings goals, and integrates external data (news/trends) to help optimize financial decisions. It's designed for individual use with a focus on privacy and personal financial empowerment.

## ✨ Key Features

### Core Financial Management
- **Income Tracking**: Monitor all sources of income, including salary, investments, and side hustles.
- **Expense Management**: Categorize and track expenses to understand spending habits.
- **Cash Flow Analysis**: Visualize income vs. expenses with interactive charts and reports.
- **Deadline Management**: Keep track of upcoming bills, subscriptions, and other financial deadlines.

### Intelligent Insights
- **News Integration**: Stay informed with a curated feed of financial news that may impact your finances.
- **AI-Driven Prioritization**: Receive smart suggestions for saving, investing, and spending based on your financial data.
- **Financial Health Reports**: Get daily, weekly, or monthly summaries of your financial health with actionable insights.

### Goal Setting & Tracking
- **Bucket List Management**: Set and track personal financial goals, such as saving for a vacation or a new car.
- **Progress Visualization**: Visualize your progress towards your goals with charts and graphs.
- **Timeline Prioritization**: Align your savings with your deadlines and opportunities to make the most of your money.

## 🏗️ Architecture

### Technologies Used
- **Frontend**: Next.js, React, TypeScript
- **Backend**: Next.js API Routes
- **Database**: MySQL with Prisma
- **Styling**: Tailwind CSS
- **Charting**: Chart.js
- **Linting**: ESLint

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
   **Note**: The frontend application is located in the `vishnu-finance` directory.

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file by copying the `.env.example` file:
   ```bash
   cp .env.example .env.local
   ```
   Update the `.env.local` file with your database credentials and any necessary API keys.

4. **Database Setup**
   Run the following commands to generate the Prisma client and push the database schema:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000) to view the application.

## 📊 Database Schema

The database schema is defined in the `prisma/schema.prisma` file. The core tables include:
- `User`: Stores user information.
- `Category`: Stores income and expense categories.
- `IncomeSource`: Stores information about sources of income.
- `Expense`: Stores expense records.
- `Deadline`: Stores financial deadlines.
- `Goal`: Stores financial goals.
- `NewsPreference`: Stores user preferences for news.
- `NewsCache`: Caches news articles.
- `FinancialReport`: Stores generated financial reports.

## 🔧 Configuration

The application is configured using environment variables. The following variables are required:
- `DATABASE_URL`: The connection string for the MySQL database.
- `NEWS_API_KEY`: Your API key for the News API.
- `GOOGLE_NEWS_RSS_URL`: The URL for the Google News RSS feed.
- `JWT_SECRET`: A secret key for signing JWTs.
- `NEXTAUTH_SECRET`: A secret key for NextAuth.

## 🤝 Contributing

This is a personal project, but suggestions and improvements are welcome. Please ensure any contributions align with the project's focus on personal finance management.

## 📝 License

This project is for personal use. All rights reserved.

## 🆘 Support

For issues or questions, please create an issue in the repository or contact the maintainer.

---

**Built with ❤️ for better financial decision making**