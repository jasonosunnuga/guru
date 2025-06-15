# Council Helpline AI Assistant

An intelligent phone-based assistant that streamlines the information gathering process for council services. When residents call the council helpline, the AI agent can understand their needs through natural conversation, navigate the council's website in real-time, and systematically collect all required information.

## Features

- **Natural Language Processing**: Understands resident inquiries through natural conversation
- **Real-time Website Analysis**: Identifies relevant services and requirements
- **Guided Information Collection**: Systematically collects all required details
- **Email/SMS Confirmation**: Sends confirmation messages to residents
- **Centralized Logging**: Captures all queries and identifies required follow-up actions
- **Staff Dashboard**: Interface for council staff to review and manage inquiries

## Tech Stack

- **Frontend**: Next.js, React, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: Supabase
- **AI/ML**: OpenAI GPT-3.5
- **Communication**: Twilio (Voice), SendGrid (Email)
- **Web Scraping**: Cheerio

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- Supabase account
- OpenAI API key
- Twilio account
- SendGrid account

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=your_verified_sender_email

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/council-helpline-ai.git
   cd council-helpline-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The application uses Supabase with the following main tables:

### queries
- `id`: UUID (primary key)
- `callSid`: String (Twilio call ID)
- `phone`: String (caller's phone number)
- `step`: Integer (conversation step)
- `status`: String (pending, in_progress, complete)
- `details`: JSONB (collected information)
- `message`: String (last message)
- `submittedAt`: Timestamp
- `createdAt`: Timestamp
- `completedAt`: Timestamp

## API Endpoints

### `/api/call-handler`
Handles incoming Twilio voice calls and manages the conversation flow.

### `/api/service-requirements`
Returns the required fields and information for a specific council service.

### `/api/scrape`
Scrapes council websites to extract service requirements.

## Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenAI for providing the GPT-3.5 API
- Twilio for voice call handling
- SendGrid for email services
- Supabase for database and authentication
- Next.js team for the amazing framework
