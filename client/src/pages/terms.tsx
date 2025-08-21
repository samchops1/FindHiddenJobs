import { Briefcase, Scale, AlertTriangle, FileText, Shield, Users } from "lucide-react";

export default function Terms() {
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
      <div className="bg-gradient-to-br from-blue-50 to-white border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Scale className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
              Terms of Service
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Please read these terms carefully before using FindHiddenJobs.com
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

        {/* Agreement */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6">Agreement to Terms</h2>
          <div className="bg-card rounded-xl border border-border p-6">
            <p className="text-lg text-muted-foreground leading-relaxed mb-4">
              By accessing and using FindHiddenJobs.com (the "Service"), you accept and agree to be bound by the 
              terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                <p className="text-yellow-800 text-sm">
                  <strong>Important:</strong> These terms may change from time to time. Continued use of the service 
                  constitutes acceptance of any changes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Service Description */}
        <section className="mb-12">
          <div className="flex items-center mb-6">
            <FileText className="w-8 h-8 text-green-600 mr-3" />
            <h2 className="text-3xl font-bold text-foreground">Service Description</h2>
          </div>
          <div className="bg-card rounded-xl border border-border p-6">
            <p className="text-muted-foreground mb-4">
              FindHiddenJobs.com is a job search aggregation service that helps users discover employment opportunities 
              by searching across multiple applicant tracking systems (ATS) and job platforms. We provide:
            </p>
            <ul className="space-y-2 text-muted-foreground mb-4">
              <li>• Search functionality across various job platforms and ATS systems</li>
              <li>• Aggregated job listings from public job postings</li>
              <li>• Direct links to official company application pages</li>
              <li>• A free, accessible interface for job discovery</li>
            </ul>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>Note:</strong> We are a search service only. All job applications are handled directly through 
                the hiring company's official channels. We do not process applications or act as a recruiting agency.
              </p>
            </div>
          </div>
        </section>

        {/* Acceptable Use */}
        <section className="mb-12">
          <div className="flex items-center mb-6">
            <Users className="w-8 h-8 text-purple-600 mr-3" />
            <h2 className="text-3xl font-bold text-foreground">Acceptable Use Policy</h2>
          </div>
          
          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-xl font-semibold text-foreground mb-3">You May:</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Use the service for personal job searching purposes</li>
                <li>• Share individual job listings with others</li>
                <li>• Access the service through standard web browsers</li>
                <li>• Report bugs or suggest improvements</li>
              </ul>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-red-800 mb-3">You May NOT:</h3>
              <ul className="space-y-2 text-red-700">
                <li>• Scrape, crawl, or automatically extract large amounts of data from our service</li>
                <li>• Use automated tools, bots, or scripts to access the service</li>
                <li>• Attempt to overwhelm our servers with excessive requests</li>
                <li>• Reverse engineer, decompile, or attempt to extract our source code</li>
                <li>• Use the service for any illegal or unauthorized purpose</li>
                <li>• Resell, redistribute, or create derivative works from our service</li>
                <li>• Impersonate other users or provide false information</li>
                <li>• Interfere with the security or proper functioning of the service</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Intellectual Property */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6">Intellectual Property Rights</h2>
          <div className="bg-card rounded-xl border border-border p-6">
            <p className="text-muted-foreground mb-4">
              The FindHiddenJobs.com service, including its design, code, logos, and content, is owned by us and protected 
              by copyright, trademark, and other intellectual property laws.
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Our Content</h3>
                <p className="text-muted-foreground text-sm">
                  You may not copy, modify, distribute, or create derivative works from our website design, 
                  functionality, or proprietary content without permission.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Job Listings</h3>
                <p className="text-muted-foreground text-sm">
                  Job listings displayed on our service remain the property of the respective hiring companies. 
                  We aggregate publicly available information and provide links to the original sources.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Disclaimers */}
        <section className="mb-12">
          <div className="flex items-center mb-6">
            <AlertTriangle className="w-8 h-8 text-orange-600 mr-3" />
            <h2 className="text-3xl font-bold text-foreground">Disclaimers</h2>
          </div>
          
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-yellow-800 mb-3">Service Availability</h3>
              <p className="text-yellow-700">
                We provide the service "as is" and "as available." We don't guarantee uninterrupted access, 
                complete accuracy of job listings, or that all job postings are current or valid. Job availability 
                and details may change after being posted on our platform.
              </p>
            </div>

            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-xl font-semibold text-foreground mb-3">Job Application Process</h3>
              <p className="text-muted-foreground mb-4">
                FindHiddenJobs.com is not involved in the hiring process. We:
              </p>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li>• Do not guarantee job interview opportunities or employment</li>
                <li>• Are not responsible for employer hiring decisions</li>
                <li>• Cannot verify the legitimacy of all job postings</li>
                <li>• Do not mediate disputes between job seekers and employers</li>
                <li>• Are not liable for any outcomes related to job applications</li>
              </ul>
            </div>

            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-xl font-semibold text-foreground mb-3">Third-Party Content</h3>
              <p className="text-muted-foreground">
                Our service includes links to external websites and displays content from third-party job platforms. 
                We are not responsible for the content, privacy practices, or terms of service of these external sites. 
                Your interactions with these sites are governed by their respective terms and policies.
              </p>
            </div>
          </div>
        </section>

        {/* Limitation of Liability */}
        <section className="mb-12">
          <div className="flex items-center mb-6">
            <Shield className="w-8 h-8 text-red-600 mr-3" />
            <h2 className="text-3xl font-bold text-foreground">Limitation of Liability</h2>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <p className="text-red-800 font-semibold mb-4">
              IMPORTANT LEGAL NOTICE
            </p>
            <div className="text-red-700 space-y-3 text-sm">
              <p>
                To the fullest extent permitted by law, FindHiddenJobs.com and its operators shall not be liable for any:
              </p>
              <ul className="space-y-1 ml-4">
                <li>• Direct, indirect, incidental, special, or consequential damages</li>
                <li>• Lost profits, data, or business opportunities</li>
                <li>• Damages arising from use or inability to use the service</li>
                <li>• Issues related to job applications, interviews, or employment outcomes</li>
                <li>• Problems with third-party websites or services linked from our platform</li>
                <li>• Technical issues, service interruptions, or data loss</li>
              </ul>
              <p className="mt-4">
                Our total liability, if any, shall not exceed the amount you paid to use the service (which is zero, 
                as our service is free).
              </p>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6">Privacy</h2>
          <div className="bg-card rounded-xl border border-border p-6">
            <p className="text-muted-foreground mb-4">
              Your privacy is important to us. Our collection and use of information is governed by our Privacy Policy, 
              which is incorporated into these terms by reference.
            </p>
            <p className="text-sm text-muted-foreground">
              Key points: We don't require user accounts, don't track your searches, and don't collect personal information. 
              Please review our full <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a> for details.
            </p>
          </div>
        </section>

        {/* Termination */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6">Termination</h2>
          <div className="bg-card rounded-xl border border-border p-6">
            <p className="text-muted-foreground mb-4">
              We reserve the right to terminate or suspend access to our service immediately, without prior notice, 
              for any reason, including breach of these terms.
            </p>
            <p className="text-muted-foreground">
              You may stop using the service at any time. Since we don't require user accounts, simply discontinuing 
              use of the website constitutes termination of your access.
            </p>
          </div>
        </section>

        {/* Changes to Terms */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6">Changes to Terms</h2>
          <div className="bg-card rounded-xl border border-border p-6">
            <p className="text-muted-foreground mb-4">
              We reserve the right to modify these terms at any time. Changes will be posted on this page with an 
              updated "Last Updated" date.
            </p>
            <p className="text-muted-foreground">
              Your continued use of the service after any changes constitutes acceptance of the new terms. We encourage 
              you to review these terms periodically for updates.
            </p>
          </div>
        </section>

        {/* Governing Law */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6">Governing Law</h2>
          <div className="bg-card rounded-xl border border-border p-6">
            <p className="text-muted-foreground">
              These terms shall be governed by and construed in accordance with the laws of the jurisdiction where 
              our service is operated, without regard to conflict of law principles. Any disputes arising from these 
              terms or use of the service shall be resolved in the appropriate courts of that jurisdiction.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section>
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border border-border p-8 text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">Questions About These Terms?</h2>
            <p className="text-lg text-muted-foreground mb-6">
              If you have any questions about these Terms of Service, please don't hesitate to reach out to us.
            </p>
            <div className="text-muted-foreground">
              <p>Contact us at <a href="mailto:sameer.s.chopra@gmail.com" className="text-primary hover:underline">sameer.s.chopra@gmail.com</a></p>
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