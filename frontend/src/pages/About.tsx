// AI was used to help write this function to validate logic and suggest improvements
import { Globe, Users, Target, Award, Zap, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useNavigate } from 'react-router';
import { Separator } from '@/components/ui/separator';

export default function About() {
  const navigate = useNavigate()
  const values = [
    {
      icon: <Target className="w-6 h-6" />,
      title: 'Mission-Driven',
      description: 'Democratizing access to satellite data for researchers, developers, and organizations worldwide.'
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Innovation',
      description: 'Pushing the boundaries of geospatial technology with cutting-edge APIs and data processing.'
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Community',
      description: 'Building a vibrant ecosystem of users who leverage Earth observation data for positive impact.'
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: 'Quality',
      description: 'Delivering reliable, high-quality satellite data with comprehensive documentation and support.'
    }
  ];

  const team = [
    {
      name: 'Jamie',
      role: 'Chef',
      background: 'She cooks',
      image: '👨‍🍳'
    },
    {
      name: 'Yiqing',
      role: 'Fisherman',
      background: 'She baits',
      image: '🚀'
    },
    {
      name: 'Vayers',
      role: 'VC',
      background: 'Alex\'s favourite',
      image: '🧙‍♀️'
    },
    {
      name: 'Amy',
      role: 'Bed Tester',
      background: 'Honk Shoo',
      image: '😴'
    }
  ];

  const stats = [
    { number: '10', label: 'API Calls per Month' },
    { number: '1', label: 'Country Served' },
    { number: '3', label: 'Satellite Data Sources' },
    { number: '100%', label: 'Uptime SLA' }
  ];

  const faqs = [
    {
      question: 'What makes your platform different?',
      answer: 'We provide a unified API that aggregates multiple satellite data sources, making it as easy to work with as any modern web service. No need to navigate different providers and formats.'
    },
    {
      question: 'Who uses your platform?',
      answer: 'Our users range from academic researchers and government agencies to NGOs and commercial enterprises working on climate monitoring, urban planning, agriculture, disaster response, and more.'
    },
    {
      question: 'How do you ensure data quality?',
      answer: 'We work directly with official satellite data providers, implement rigorous validation processes, and maintain comprehensive documentation.'
    }];

  const handleViewDocumentation = () => {
    navigate('/documentation')
  }

  return (
    <div className="min-h-screen bg-slate-50" >
      {/* Header */}
      < div className="border-b bg-white" >
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">About Us</h1>
          </div>
          <p className="text-slate-600">Making satellite intelligence accessible for everyone</p>
        </div>
      </div >

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <Card key={idx}>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">{stat.number}</div>
                <div className="text-sm text-slate-600">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Our Story */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-5 h-5 text-blue-600" />
              <Badge variant="outline">Our Story</Badge>
            </div>
            <CardTitle className='text-lg'>Born from a Vision to Make Space Data Usable</CardTitle>
            <CardDescription className='text-md'>
              How we're making satellite intelligence accessible for everyone
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p>
              Founded in 2025 by two business students and two computer science students passionate about Earth observation, LEONA was created to solve a growing problem: satellite data is abundant — but painfully hard to use.
            </p>
            <p>
              We saw that while thousands of satellites capture terabytes of open data every day, only a fraction ever reaches the people who could turn it into action. Most of it remains trapped behind complex file formats, APIs, and technical know-how.
            </p>
            <p>
              LEONA changes that.
              We built an AI native-language interface that lets anyone query satellite data in plain language and receive structured, ready-to-use outputs. It bridges the gap between orbital data and real-world application — empowering developers, researchers, and enterprises to build tools that monitor forests, optimise agriculture, plan cities, and much more.
            </p>
            <Separator />
            <p className='font-semibold'>
              Our mission is simple:
              To bring space data down to Earth — making it usable, understandable, and open for innovation.
            </p>
          </CardContent>
        </Card>

        {/* Values */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Our Values</h2>
            <p className="text-slate-600">The principles that guide everything we do</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {values.map((value, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                      {value.icon}
                    </div>
                    <CardTitle className="text-lg">{value.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 text-sm">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Team */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Meet the Team</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {team.map((member, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <div className="text-5xl mb-3 text-center">{member.image}</div>
                  <CardTitle className="text-center text-lg">{member.name}</CardTitle>
                  <CardDescription className="text-center">{member.role}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 text-center">{member.background}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
            <CardDescription>Learn more about our platform and mission</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, idx) => (
                <AccordionItem key={idx} value={`item-${idx}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-slate-600">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* CTA Card */}
        <Card className="bg-blue-600 text-white border-blue-600">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Ready to Get Started?</CardTitle>
            <CardDescription className="text-blue-100">
              Join thousands of developers and researchers using our platform
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button className="bg-white text-blue-600 hover:bg-blue-50" onClick={handleViewDocumentation}>
              View Documentation
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div >
  );
}
