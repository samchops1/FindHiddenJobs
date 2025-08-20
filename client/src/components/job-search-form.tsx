import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { searchRequestSchema, type SearchRequest } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Briefcase, Building, Search, MapPin } from "lucide-react";

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
          <div className="grid md:grid-cols-12 gap-6">
            <div className="md:col-span-4">
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
                          placeholder="e.g., Software Engineer, Product Manager"
                          className="pl-12 py-4 text-lg border-border focus:ring-2 focus:ring-primary bg-card hover:bg-muted/50 transition-colors"
                          data-testid="input-job-title"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="md:col-span-3">
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
                            className="pl-12 py-4 text-lg border-border focus:ring-2 focus:ring-primary bg-card hover:bg-muted/50 transition-colors"
                            data-testid="select-platform"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">🔍 All Platforms</SelectItem>
                            <SelectItem value="boards.greenhouse.io">🌱 Greenhouse</SelectItem>
                            <SelectItem value="jobs.lever.co">🎯 Lever</SelectItem>
                            <SelectItem value="jobs.ashbyhq.com">💼 Ashby</SelectItem>
                            <SelectItem value="jobs.workable.com">⚡ Workable</SelectItem>
                            <SelectItem value="myworkdayjobs.com">📊 Workday</SelectItem>
                            <SelectItem value="adp">🏢 ADP</SelectItem>
                            <SelectItem value="careers.*">🚀 Career Pages</SelectItem>
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

            <div className="md:col-span-3">
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
                            className="pl-12 py-4 text-lg border-border focus:ring-2 focus:ring-primary bg-card hover:bg-muted/50 transition-colors"
                            data-testid="select-location"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">🌍 All Locations</SelectItem>
                            <SelectItem value="remote">🏠 Remote Only</SelectItem>
                            <SelectItem value="onsite">🏢 On-site Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="md:col-span-2 flex items-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-4 px-8 text-lg rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
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
