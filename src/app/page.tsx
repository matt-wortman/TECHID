import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, ClipboardCheck, Database, Edit, Timer } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="text-primary font-bold text-xl">✚</div>
              <span className="font-semibold text-lg">CCHMC</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-foreground hover:text-primary border-b-2 border-primary pb-1">
                Home
              </Link>
              <Link href="/dynamic-form/builder" className="text-muted-foreground hover:text-foreground">
                Builder
              </Link>
              <Link href="/dynamic-form">
                <Button>Start Evaluation</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white">
        <div className="container mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Technology
                <br />
                Triage Platform
              </h1>
              <p className="text-xl text-blue-100">
                Streamline your technology evaluation process
              </p>
              <Link href="/dynamic-form">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Start Evaluation
                </Button>
              </Link>
            </div>

            {/* 3D Technology Visual Elements */}
            <div className="relative">
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="space-y-4">
                  <Card className="bg-blue-500/20 border-blue-400/30 backdrop-blur-sm">
                    <CardContent className="p-4 text-center">
                      <BarChart3 className="h-8 w-8 mx-auto mb-2 text-blue-300" />
                      <span className="text-sm text-blue-100">Analytics</span>
                    </CardContent>
                  </Card>
                  <Card className="bg-cyan-500/20 border-cyan-400/30 backdrop-blur-sm">
                    <CardContent className="p-4 text-center">
                      <Database className="h-8 w-8 mx-auto mb-2 text-cyan-300" />
                      <span className="text-sm text-cyan-100">Data</span>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-center">
                  <Card className="bg-primary/30 border-primary/50 backdrop-blur-sm p-8">
                    <CardContent className="p-0 text-center">
                      <div className="w-16 h-16 mx-auto bg-primary rounded-full flex items-center justify-center mb-2">
                        <Edit className="h-8 w-8 text-primary-foreground" />
                      </div>
                      <span className="text-sm text-blue-100">Evaluate</span>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <Card className="bg-purple-500/20 border-purple-400/30 backdrop-blur-sm">
                    <CardContent className="p-4 text-center">
                      <ClipboardCheck className="h-8 w-8 mx-auto mb-2 text-purple-300" />
                      <span className="text-sm text-purple-100">Assessment</span>
                    </CardContent>
                  </Card>
                  <Card className="bg-teal-500/20 border-teal-400/30 backdrop-blur-sm">
                    <CardContent className="p-4 text-center">
                      <Timer className="h-8 w-8 mx-auto mb-2 text-teal-300" />
                      <span className="text-sm text-teal-100">Scoring</span>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 Technology Triage Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
