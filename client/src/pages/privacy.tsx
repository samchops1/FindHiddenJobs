import { Briefcase, Shield, Eye, Database, Lock, UserX } from "lucide-react";

export default function Privacy() {
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
      <div className="bg-gradient-to-br from-green-50 to-white border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
              Privacy Policy
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Your privacy is important to us. This policy explains how we handle your data.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Last Updated */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
          <p className="text-sm text-blue-800">
            <strong>Last Updated:</strong> August 21, 2024
          </p>
        </div>

        {/* Overview */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6">Overview</h2>
          <div className="bg-card rounded-xl border border-border p-6">
            <p className="text-lg text-muted-foreground leading-relaxed mb-4">
              FindHiddenJobs.com is committed to protecting your privacy. We've designed our service to be 
              privacy-first: we don't require user accounts, don't track your job searches, and don't collect 
              personal information.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              This Privacy Policy explains what minimal data we collect, how we use it, and your rights regarding 
              your information.
            </p>
          </div>
        </section>

        {/* Information We Collect */}
        <section className="mb-12">
          <div className="flex items-center mb-6">
            <Database className="w-8 h-8 text-blue-600 mr-3" />
            <h2 className="text-3xl font-bold text-foreground">Information We Collect</h2>
          </div>
          
          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-xl font-semibold text-foreground mb-3">Information We DON'T Collect</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center">
                  <UserX className="w-4 h-4 mr-2 text-green-600" />
                  Personal identification information (name, email, phone)
                </li>
                <li className="flex items-center">
                  <UserX className="w-4 h-4 mr-2 text-green-600" />
                  User accounts or login credentials
                </li>
                <li className="flex items-center">
                  <UserX className="w-4 h-4 mr-2 text-green-600" />
                  Search history or job preferences
                </li>
                <li className="flex items-center">
                  <UserX className="w-4 h-4 mr-2 text-green-600" />
                  Resume or application materials
                </li>
                <li className="flex items-center">
                  <UserX className="w-4 h-4 mr-2 text-green-600" />
                  Tracking cookies or advertising identifiers
                </li>
              </ul>
            </div>

            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-xl font-semibold text-foreground mb-3">Minimal Technical Data</h3>
              <p className="text-muted-foreground mb-4">
                To provide our service and maintain security, we may collect limited technical information:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Basic server logs (IP addresses, request timestamps)</li>
                <li>• Error logs for debugging and service improvement</li>
                <li>• General usage analytics (page visits, not linked to individuals)</li>
                <li>• Browser type and version (for compatibility purposes)</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-4">
                This data is automatically deleted after 30 days and is never used for tracking or profiling.
              </p>
            </div>
          </div>
        </section>

        {/* How We Use Information */}
        <section className="mb-12">
          <div className="flex items-center mb-6">
            <Eye className="w-8 h-8 text-purple-600 mr-3" />
            <h2 className="text-3xl font-bold text-foreground">How We Use Information</h2>
          </div>
          
          <div className="bg-card rounded-xl border border-border p-6">
            <p className="text-muted-foreground mb-4">
              The minimal technical data we collect is used solely for:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li>
                <strong className="text-foreground">Service Operation:</strong> 
                Providing search results and maintaining platform functionality
              </li>
              <li>
                <strong className="text-foreground">Security:</strong> 
                Preventing abuse, spam, and ensuring fair usage of our resources
              </li>
              <li>
                <strong className="text-foreground">Technical Improvement:</strong> 
                Fixing bugs, optimizing performance, and enhancing user experience
              </li>
              <li>
                <strong className="text-foreground">Legal Compliance:</strong> 
                Meeting any applicable legal requirements
              </li>
            </ul>
            <p className="text-sm text-muted-foreground mt-4">
              We never use this data for advertising, marketing, or any commercial purposes beyond providing our free service.
            </p>
          </div>
        </section>

        {/* Data Sharing */}
        <section className="mb-12">
          <div className="flex items-center mb-6">
            <Lock className="w-8 h-8 text-red-600 mr-3" />
            <h2 className="text-3xl font-bold text-foreground">Data Sharing & Third Parties</h2>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <p className="text-red-800 font-semibold text-lg">
              We do not sell, trade, or share your data with third parties.
            </p>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-xl font-semibold text-foreground mb-3">Limited Exceptions</h3>
            <p className="text-muted-foreground mb-4">
              We may only share information in these specific circumstances:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>• <strong>Legal Requirements:</strong> When required by law, court order, or legal process</li>
              <li>• <strong>Safety & Security:</strong> To protect against fraud, abuse, or security threats</li>
              <li>• <strong>Service Providers:</strong> With trusted technical providers (hosting, CDN) under strict privacy agreements</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-4">
              Note: When you click on job listings, you'll be redirected to the company's official application page. 
              Your interaction with their site is governed by their privacy policy, not ours.
            </p>
          </div>
        </section>

        {/* Data Security */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6">Data Security</h2>
          <div className="bg-card rounded-xl border border-border p-6">
            <p className="text-muted-foreground mb-4">
              We implement appropriate technical and organizational measures to protect the limited data we collect:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>• HTTPS encryption for all data transmission</li>
              <li>• Secure server infrastructure with regular security updates</li>
              <li>• Limited data retention (automatic deletion after 30 days)</li>
              <li>• Access controls and monitoring systems</li>
              <li>• Regular security audits and assessments</li>
            </ul>
          </div>
        </section>

        {/* Your Rights */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6">Your Rights</h2>
          <div className="bg-card rounded-xl border border-border p-6">
            <p className="text-muted-foreground mb-4">
              Since we don't collect personal information or create user profiles, most privacy concerns don't apply. However, you have the right to:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>• <strong>Access:</strong> Request information about any data we might have</li>
              <li>• <strong>Correction:</strong> Request correction of any inaccurate data</li>
              <li>• <strong>Deletion:</strong> Request deletion of any data we hold</li>
              <li>• <strong>Objection:</strong> Object to our processing of your data</li>
              <li>• <strong>Portability:</strong> Request a copy of your data in a portable format</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-4">
              To exercise these rights, please contact us through our GitHub repository or available contact methods.
            </p>
          </div>
        </section>

        {/* Cookies */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6">Cookies & Tracking</h2>
          <div className="bg-card rounded-xl border border-border p-6">
            <p className="text-muted-foreground mb-4">
              FindHiddenJobs.com uses minimal cookies and tracking:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>• <strong>Essential Cookies:</strong> Required for basic site functionality (session management, preferences)</li>
              <li>• <strong>No Tracking Cookies:</strong> We don't use advertising or analytics cookies that follow you across sites</li>
              <li>• <strong>No Third-Party Trackers:</strong> We don't embed social media widgets or advertising pixels</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-4">
              You can disable cookies in your browser settings, though this may affect site functionality.
            </p>
          </div>
        </section>

        {/* Changes to Policy */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6">Changes to This Policy</h2>
          <div className="bg-card rounded-xl border border-border p-6">
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time to reflect changes in our practices or applicable laws. 
              Any changes will be posted on this page with an updated "Last Updated" date. We encourage you to review 
              this policy periodically for any changes.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section>
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border border-border p-8 text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">Questions About Privacy?</h2>
            <p className="text-lg text-muted-foreground mb-6">
              We're committed to transparency about our privacy practices. If you have any questions or concerns 
              about this policy or how we handle data, please don't hesitate to reach out.
            </p>
            <div className="text-muted-foreground">
              <p>Contact us through our GitHub repository or available contact methods.</p>
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