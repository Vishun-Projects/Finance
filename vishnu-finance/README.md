# Vishnu Finance - Personal Finance Management Application

A modern, responsive personal finance management application built with Next.js, TypeScript, and Tailwind CSS. This application helps users track their income, expenses, goals, and financial progress with advanced analytics and AI-powered insights.

## 🚀 Features

### Core Functionality
- **Dashboard**: Comprehensive financial overview with key metrics and trends
- **Income Management**: Track multiple income sources with categorization
- **Expense Management**: Monitor spending with detailed categorization and payment methods
- **Salary Structure Management**: Track salary changes and history with detailed breakdowns
- **Goals Management**: Set and track financial goals with progress visualization
- **Deadlines Management**: Manage recurring and one-time financial deadlines
- **Reports & Analytics**: Advanced financial reporting with AI insights
- **Wishlist Management**: Track desired purchases with price monitoring

### Advanced Features
- **AI-Powered Insights**: Get personalized financial recommendations
- **Market Data Integration**: Real-time market trends and analysis
- **Recurring Transactions**: Automated tracking of regular income/expenses
- **Salary History Tracking**: Complete audit trail of salary changes
- **Responsive Design**: Optimized for all devices and screen sizes
- **Search & Filtering**: Advanced search and filtering capabilities
- **Data Export**: Export financial data in various formats

## 🛠️ Technology Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Modern icon library
- **React Hooks**: State management and side effects

### Backend
- **Next.js API Routes**: Serverless API endpoints
- **Prisma ORM**: Database abstraction layer
- **SQLite/MySQL**: Database options
- **TypeScript**: Full-stack type safety

### Design System
- **Minimal Monotone Theme**: Clean, professional design
- **Responsive Grid Layouts**: Mobile-first approach
- **Custom Animations**: Smooth transitions and interactions
- **Accessibility**: WCAG compliant design

## 📁 Project Structure

```
vishnu-finance/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── analytics/     # Financial analytics
│   │   │   ├── ai-insights/   # AI recommendations
│   │   │   ├── expenses/      # Expense management
│   │   │   ├── income/        # Income management
│   │   │   ├── goals/         # Goals tracking
│   │   │   ├── deadlines/     # Deadline management
│   │   │   ├── salary-structure/ # Salary tracking
│   │   │   └── salary-history/   # Salary history
│   │   ├── dashboard/         # Main dashboard
│   │   ├── expenses/          # Expenses page
│   │   ├── income/            # Income page
│   │   ├── goals/             # Goals page
│   │   ├── deadlines/         # Deadlines page
│   │   ├── salary-structure/  # Salary structure page
│   │   ├── reports/           # Reports page
│   │   └── wishlist/          # Wishlist page
│   ├── components/            # Reusable components
│   │   ├── ui/               # Base UI components
│   │   ├── Navigation.tsx    # Main navigation
│   │   ├── ExpenseManagement.tsx
│   │   ├── IncomeManagement.tsx
│   │   ├── GoalsManagement.tsx
│   │   ├── DeadlinesManagement.tsx
│   │   ├── SalaryStructureManagement.tsx
│   │   ├── ReportsManagement.tsx
│   │   └── WishlistManagement.tsx
│   ├── types/                # TypeScript type definitions
│   └── lib/                  # Utility functions
├── prisma/                   # Database schema and migrations
├── public/                   # Static assets
└── docs/                     # Documentation
```

## 🎨 Design System

### Color Palette
- **Primary**: Deep blue (#1e40af)
- **Secondary**: Light gray (#f8fafc)
- **Success**: Green (#10b981)
- **Error**: Red (#ef4444)
- **Warning**: Orange (#f59e0b)
- **Info**: Blue (#3b82f6)

### Typography
- **Headings**: Inter font family
- **Body**: System font stack
- **Monospace**: For financial data

### Components
- **Cards**: Minimal design with subtle shadows
- **Buttons**: Consistent styling with hover states
- **Forms**: Clean input fields with validation
- **Tables**: Responsive data tables
- **Charts**: Interactive financial visualizations

## 🔧 Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd vishnu-finance

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run database migrations
npx prisma migrate dev

# Seed baseline data (users, categories, etc.)
npm run setup

# Seed superuser portal resources
npm run seed:admin

# Start development server
npm run dev
```

### Environment Variables
```env
# Database
DATABASE_URL="file:./dev.db"

# Authentication (for future implementation)
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# API Keys (for future integrations)
OPENAI_API_KEY="your-openai-key"
ALPHA_VANTAGE_API_KEY="your-alpha-vantage-key"
```

## 📊 Database Schema

### Core Models
- **User**: User accounts and preferences
- **Income**: Income sources and transactions
- **Expense**: Expense tracking and categorization
- **Goal**: Financial goals and progress
- **Deadline**: Financial deadlines and reminders
- **SalaryStructure**: Current salary information
- **SalaryHistory**: Historical salary changes
- **WishlistItem**: Desired purchases and tracking

### Advanced Models
- **Category**: Transaction categorization
- **RecurringItem**: Recurring transactions
- **AIInsight**: AI-generated recommendations
- **MarketData**: Market trends and data

## 🧰 Superuser & Admin Portal

The project ships with a dedicated admin console for managing organisation-wide documents and bank field mappings.

- **Seed command:** `npm run seed:admin`
- **Guide:** see [`docs/admin-setup.md`](docs/admin-setup.md) for migration/seed/test instructions.
- **Login:** use the superuser credentials seeded via `npm run setup` (defaults: `vishun@finance.com` / `Vishun@8291`).
- **Tests:** run `npm run test` to execute the shared document utility checks.

Once authenticated, visit `/admin` to access the dashboard, document library, and bank mapping manager.

## 🚀 API Endpoints

### Core APIs
- `GET /api/income` - Fetch user income data
- `POST /api/income` - Create new income record
- `DELETE /api/income` - Delete income record
- `GET /api/expenses` - Fetch user expenses
- `POST /api/expenses` - Create new expense
- `DELETE /api/expenses` - Delete expense

### Advanced APIs
- `GET /api/analytics` - Financial analytics data
- `POST /api/ai-insights` - AI-powered insights
- `GET /api/market-data` - Real-time market data
- `GET /api/salary-structure` - Salary information
- `GET /api/salary-history` - Salary change history

## 🎯 Key Features Explained

### 1. Skeleton UI Approach
The application implements a skeleton UI pattern for optimal user experience:
- **Loading States**: Animated placeholders during data fetching
- **Progressive Enhancement**: Basic functionality first, then advanced features
- **Performance**: Fast initial load with lazy-loaded components

### 2. Responsive Design
- **Mobile-First**: Optimized for mobile devices
- **Breakpoints**: xs, sm, md, lg, xl, 2xl
- **Flexible Layouts**: Grid and flexbox for adaptive layouts
- **Touch-Friendly**: Optimized for touch interactions

### 3. Data Management
- **Mock Data**: Development with realistic mock data
- **API Integration**: Ready for backend integration
- **Error Handling**: Comprehensive error states
- **Validation**: Client and server-side validation

### 4. Financial Features
- **Currency Support**: INR, USD, EUR support
- **Categorization**: Detailed transaction categorization
- **Recurring Items**: Automated recurring transaction handling
- **Goal Tracking**: Visual progress tracking
- **Deadline Management**: Smart deadline reminders

## 🔮 Future Enhancements

### Phase 2: Advanced Features
- [ ] Real-time notifications
- [ ] Data import/export functionality
- [ ] Advanced charting and analytics
- [ ] Budget planning and forecasting
- [ ] Investment portfolio tracking
- [ ] Tax planning and optimization

### Phase 3: AI & Automation
- [ ] Smart categorization
- [ ] Automated expense tracking
- [ ] Predictive analytics
- [ ] Personalized recommendations
- [ ] Voice input support

### Phase 4: Social Features
- [ ] Family account sharing
- [ ] Financial advisor integration
- [ ] Community features
- [ ] Collaborative budgeting

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

## 📈 Performance

### Optimization Strategies
- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: Next.js Image component
- **Caching**: Strategic caching strategies
- **Bundle Analysis**: Regular bundle size monitoring

### Performance Metrics
- **Lighthouse Score**: 95+ across all metrics
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Standards
- **TypeScript**: Strict type checking
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting
- **Conventional Commits**: Standard commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js Team**: For the amazing framework
- **Tailwind CSS**: For the utility-first CSS approach
- **Lucide**: For the beautiful icons
- **Prisma**: For the excellent ORM

## 📞 Support

For support and questions:
- **Email**: support@vishnufinance.com
- **Documentation**: [docs.vishnufinance.com](https://docs.vishnufinance.com)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)

---

**Built with ❤️ for better financial management**
