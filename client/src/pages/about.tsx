import { Briefcase, Search, Globe, Users, Target, Shield } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-bold text-blue-600">find</span>
                  <span className="text-2xl font-bold text-gray-600">hidden</span>
                  <span className="text-2xl font-bold text-green-600">jobs</span>
                </div>
                <span className="text-sm text-gray-500 font-medium">.com</span>
              </div>
            </div>
            <nav>
              <a href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                ← Back to Search
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-50 to-white border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
              About FindHiddenJobs.com
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              We're on a mission to democratize job discovery by surfacing opportunities that traditional job boards miss.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Mission Section */}
        <section className="mb-16">
          <div className="bg-card rounded-2xl border border-border p-8">
            <div className="flex items-center mb-6">
              <Target className="w-8 h-8 text-primary mr-3" />
              <h2 className="text-3xl font-bold text-foreground">Our Mission</h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              Many of the best job opportunities never make it to LinkedIn or Indeed. They live on company ATS platforms 
              like Greenhouse, Lever, Ashby, and Workday - hidden from most job seekers. FindHiddenJobs.com bridges this 
              gap by systematically discovering and aggregating these opportunities in one place.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              We believe every job seeker deserves access to the complete job market, not just the positions that companies 
              pay to promote on major job boards.
            </p>
          </div>
        </section>

        {/* What We Do */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">What We Do</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card rounded-xl border border-border p-6 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Comprehensive Search</h3>
              <p className="text-muted-foreground">
                We search across 50+ ATS platforms and job systems to find opportunities others miss.
              </p>
            </div>
            <div className="bg-card rounded-xl border border-border p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Real-Time Results</h3>
              <p className="text-muted-foreground">
                Our technology provides live access to job postings as they're published on company platforms.
              </p>
            </div>
            <div className="bg-card rounded-xl border border-border p-6 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Free Access</h3>
              <p className="text-muted-foreground">
                We're committed to keeping job search free and accessible to everyone, regardless of background.
              </p>
            </div>
          </div>
        </section>

        {/* Our Approach */}
        <section className="mb-16">
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl border border-border p-8">
            <h2 className="text-3xl font-bold text-foreground mb-6">Our Approach</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Technology-Driven Discovery</h3>
                <p className="text-muted-foreground">
                  We use advanced web scraping and API integration to systematically discover job postings across 
                  major applicant tracking systems (ATS) that companies use to manage their hiring.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Quality Over Quantity</h3>
                <p className="text-muted-foreground">
                  Rather than flooding you with thousands of irrelevant results, we focus on surfacing high-quality 
                  opportunities that match your search criteria from reputable sources.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Respectful Practices</h3>
                <p className="text-muted-foreground">
                  We maintain ethical scraping practices, respect robots.txt files, and implement rate limiting 
                  to ensure we don't impact the performance of the platforms we search.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy & Trust */}
        <section className="mb-16">
          <div className="bg-card rounded-2xl border border-border p-8">
            <div className="flex items-center mb-6">
              <Shield className="w-8 h-8 text-green-600 mr-3" />
              <h2 className="text-3xl font-bold text-foreground">Privacy & Trust</h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              We take your privacy seriously. FindHiddenJobs.com doesn't require user accounts, track your searches, 
              or store personal information. We simply provide a search interface to help you discover opportunities.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              All job applications are handled directly through the company's official channels - we never act as 
              an intermediary in the application process.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="text-center">
          <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-2xl border border-border p-8">
            <h2 className="text-3xl font-bold text-foreground mb-4">Questions or Feedback?</h2>
            <p className="text-lg text-muted-foreground mb-6">
              We're always working to improve our service and would love to hear from you.
            </p>
            <div className="text-muted-foreground">
              <p>For inquiries, please contact us at <a href="mailto:sameer.s.chopra@gmail.com" className="text-primary hover:underline">sameer.s.chopra@gmail.com</a></p>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              &copy; 2024 FindHiddenJobs.com. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}