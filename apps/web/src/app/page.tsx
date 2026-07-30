import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background">
      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

      <main className="relative z-10 mx-auto flex max-w-3xl flex-col items-center justify-center gap-8 px-6 text-center animate-in fade-in zoom-in-95 duration-1000 ease-out">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary shadow-sm ring-1 ring-primary/10 transition-all hover:bg-primary/10 animate-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
          <Sparkles className="size-4" />
          <span>Enterprise CRM</span>
        </div>

        {/* Hero Text */}
        <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-6 duration-700 delay-300 fill-mode-both">
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight bg-gradient-to-br from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-transparent pb-2">
            Gnevo CRM
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            The intelligent CRM for digital marketing &amp; SEO agencies. Manage leads, customers, deals, and pipelines in one incredibly fast workspace.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-4 flex animate-in slide-in-from-bottom-8 duration-700 delay-500 fill-mode-both">
          <Button 
            nativeButton={false} 
            render={<Link href="/login" />}
            size="lg"
            className="group h-14 rounded-full px-8 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-1 active:translate-y-0"
          >
            Get Started
            <ArrowRight className="ml-2 size-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Button>
        </div>

      </main>
    </div>
  );
}
