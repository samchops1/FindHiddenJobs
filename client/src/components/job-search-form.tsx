import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { searchRequestSchema, type SearchRequest } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Briefcase, Building, Search, MapPin, Clock } from "lucide-react";

interface JobSearchFormProps {
  onSearch: (params: SearchRequest) => void;
}

export function JobSearchForm({ onSearch }: JobSearchFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SearchRequest>({
    resolver: zodResolver(searchRequestSchema),
    defaultValues: {
      query: "",
      site: "all",
      location: "all",
      timeFilter: "all",
    },
  });

  const handleSubmit = async (data: SearchRequest) => {
    setIsSubmitting(true);
    try {
      onSearch(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickSearchTerms = [
    "Frontend Developer",
    "Product Manager", 
    "Director",
    "Engineering Manager",
    "Data Scientist",
    "UX Designer"
  ];

  const handleQuickSearch = (term: string) => {
    form.setValue("query", term);
    handleSubmit({ ...form.getValues(), query: term });
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-foreground mb-2">Start Your Search</h3>
        <p className="text-muted-foreground">Search thousands of jobs from top companies</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="md:col-span-2 lg:col-span-2">
              <FormField
                control={form.control}
                name="query"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Job Title
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Briefcase className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                        <Input
                          {...field}
                          placeholder="e.g., Software Engineer"
                          className="pl-12 py-2.5 text-sm border-border focus:ring-2 focus:ring-primary bg-card hover:bg-muted/50 transition-colors"
                          data-testid="input-job-title"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="lg:col-span-1">
              <FormField
                control={form.control}
                name="site"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Platform
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Building className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 z-10" />
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger 
                            className="pl-12 py-2.5 text-sm border-border focus:ring-2 focus:ring-primary bg-card hover:bg-muted/50 transition-colors w-full"
                            data-testid="select-platform"
                          >
                            <SelectValue placeholder="🔍 All Major Platforms" />
                          </SelectTrigger>
                          <SelectContent className="max-h-96 overflow-y-auto">
                            <SelectItem value="all">🔍 All Major Platforms</SelectItem>
                            
                            {/* Major ATS Platforms */}
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Major ATS</div>
                            <SelectItem value="greenhouse.io">🌱 Greenhouse</SelectItem>
                            <SelectItem value="lever.co">🎯 Lever</SelectItem>
                            <SelectItem value="ashbyhq.com">💼 Ashby</SelectItem>
                            <SelectItem value="myworkdayjobs.com">📊 Workday</SelectItem>
                            <SelectItem value="jobs.workable.com">⚡ Workable</SelectItem>
                            <SelectItem value="adp">🏢 ADP</SelectItem>
                            <SelectItem value="icims.com">📝 iCIMS</SelectItem>
                            <SelectItem value="jobvite.com">🎨 Jobvite</SelectItem>
                            
                            {/* Newer Platforms */}
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Modern Platforms</div>
                            <SelectItem value="remoterocketship.com">🚀 Remote Rocketship</SelectItem>
                            <SelectItem value="wellfound.com">💡 Wellfound (AngelList)</SelectItem>
                            <SelectItem value="workatastartup.com">⚡ Y Combinator</SelectItem>
                            <SelectItem value="builtin.com">🏗️ Built In</SelectItem>
                            <SelectItem value="rippling-ats.com">💫 Rippling</SelectItem>
                            <SelectItem value="jobs.gusto.com">🎯 Gusto</SelectItem>
                            <SelectItem value="dover.io">🌊 Dover</SelectItem>
                            
                            {/* HR Platforms */}
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">HR Systems</div>
                            <SelectItem value="recruiting.paylocity.com">💰 Paylocity</SelectItem>
                            <SelectItem value="breezy.hr">🌬️ BreezyHR</SelectItem>
                            <SelectItem value="applytojob.com">🎺 JazzHR</SelectItem>
                            <SelectItem value="jobs.smartrecruiters.com">🧠 SmartRecruiters</SelectItem>
                            <SelectItem value="trinethire.com">🔺 TriNet</SelectItem>
                            <SelectItem value="recruitee.com">👥 Recruitee</SelectItem>
                            <SelectItem value="teamtailor.com">✨ Teamtailor</SelectItem>
                            <SelectItem value="homerun.co">🏃 Homerun</SelectItem>
                            
                            {/* Specialized Platforms */}
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Specialized</div>
                            <SelectItem value="pinpointhq.com">📍 Pinpoint</SelectItem>
                            <SelectItem value="keka.com">🎯 Keka</SelectItem>
                            <SelectItem value="oraclecloud.com">☁️ Oracle Cloud</SelectItem>
                            <SelectItem value="careerpuck.com">🏒 CareerPuck</SelectItem>
                            <SelectItem value="jobappnetwork.com">🌐 TalentReef</SelectItem>
                            <SelectItem value="gem.com">💎 Gem</SelectItem>
                            <SelectItem value="trakstar.com">⭐ Trakstar</SelectItem>
                            <SelectItem value="catsone.com">🐱 CATS</SelectItem>
                            <SelectItem value="notion.site">📝 Notion Sites</SelectItem>
                            
                            {/* Major Job Boards */}
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Job Boards</div>
                            <SelectItem value="linkedin.com">💼 LinkedIn</SelectItem>
                            <SelectItem value="glassdoor.com">🚪 Glassdoor</SelectItem>
                            
                            {/* Generic Patterns */}
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Generic Patterns</div>
                            <SelectItem value="jobs.*">🔍 Jobs Subdomains</SelectItem>
                            <SelectItem value="careers.*">🚀 Career Pages</SelectItem>
                            <SelectItem value="people.*">👥 People Subdomains</SelectItem>
                            <SelectItem value="talent.*">⭐ Talent Subdomains</SelectItem>
                            <SelectItem value="other-pages">📋 Other Job Pages</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="lg:col-span-1">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Location
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 z-10" />
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger 
                            className="pl-12 py-2.5 text-sm border-border focus:ring-2 focus:ring-primary bg-card hover:bg-muted/50 transition-colors w-full"
                            data-testid="select-location"
                          >
                            <SelectValue placeholder="🌍 All Locations" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">🌍 All Locations</SelectItem>
                            <SelectItem value="remote">🏠 Remote Only</SelectItem>
                            <SelectItem value="onsite">🏢 On-site Only</SelectItem>
                            <SelectItem value="hybrid">🔄 Hybrid</SelectItem>
                            <SelectItem value="united-states">🇺🇸 United States</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="lg:col-span-1">
              <FormField
                control={form.control}
                name="timeFilter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Posted Within
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Clock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 z-10" />
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger 
                            className="pl-12 py-2.5 text-sm border-border focus:ring-2 focus:ring-primary bg-card hover:bg-muted/50 transition-colors w-full"
                            data-testid="select-time-filter"
                          >
                            <SelectValue placeholder="🕰️ Any Time" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">🕰️ Any Time</SelectItem>
                            <SelectItem value="h1">🔥 Past Hour</SelectItem>
                            <SelectItem value="h4">⚡ Past 4 Hours</SelectItem>
                            <SelectItem value="h8">🌙 Past 8 Hours</SelectItem>
                            <SelectItem value="h12">🌅 Past 12 Hours</SelectItem>
                            <SelectItem value="d">📅 Past 24 Hours</SelectItem>
                            <SelectItem value="h48">📆 Past 48 Hours</SelectItem>
                            <SelectItem value="h72">🗓️ Past 72 Hours</SelectItem>
                            <SelectItem value="w">📈 Past Week</SelectItem>
                            <SelectItem value="m">🗒️ Past Month</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="md:col-span-2 lg:col-span-1 flex items-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 px-4 text-sm rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
                data-testid="button-search"
              >
                <Search className="w-5 h-5 mr-2" />
                {isSubmitting ? "Searching..." : "Search Jobs"}
              </Button>
            </div>
          </div>
        </form>
      </Form>

      {/* Quick Filter Tags */}
      <div className="text-center">
        <span className="text-sm text-muted-foreground mb-4 block">Popular searches:</span>
        <div className="flex flex-wrap justify-center gap-3">
          {quickSearchTerms.map((term) => (
            <button
              key={term}
              onClick={() => handleQuickSearch(term)}
              className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-sm rounded-full transition-all duration-200 hover:shadow-md border border-border hover:border-primary/50"
              data-testid={`button-quick-search-${term.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {term}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
