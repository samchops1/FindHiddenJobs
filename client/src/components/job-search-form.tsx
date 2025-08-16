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
    "Data Scientist",
    "UX Designer"
  ];

  const handleQuickSearch = (term: string) => {
    form.setValue("query", term);
    handleSubmit({ ...form.getValues(), query: term });
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid md:grid-cols-12 gap-4">
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
                        <Briefcase className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          {...field}
                          placeholder="e.g., Software Engineer, Product Manager"
                          className="pl-12 py-3 border-gray-300 focus:ring-2 focus:ring-primary-500"
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
                        <Building className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger 
                            className="pl-12 py-3 border-gray-300 focus:ring-2 focus:ring-primary-500"
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
                        <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger 
                            className="pl-12 py-3 border-gray-300 focus:ring-2 focus:ring-primary-500"
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
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 transition-all duration-200 transform hover:scale-105"
                data-testid="button-search"
              >
                <Search className="w-4 h-4 mr-2" />
                {isSubmitting ? "Searching..." : "Search Jobs"}
              </Button>
            </div>
          </div>
        </form>
      </Form>

      {/* Quick Filter Tags */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-gray-600">Popular searches:</span>
        {quickSearchTerms.map((term) => (
          <button
            key={term}
            onClick={() => handleQuickSearch(term)}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-full transition-colors duration-200"
            data-testid={`button-quick-search-${term.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );
}
