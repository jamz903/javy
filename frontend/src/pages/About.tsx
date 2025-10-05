import { Satellite, Globe, Users, Target, Award, Zap, ArrowRight } from 'lucide-react';
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
      name: 'Dr. Sarah Chen',
      role: 'CEO & Co-Founder',
      background: 'Former NASA scientist with 15+ years in remote sensing',
      image: '👩‍🔬'
    },
    {
      name: 'Marcus Rodriguez',
      role: 'CTO & Co-Founder',
      background: 'Ex-SpaceX engineer specializing in satellite systems',
      image: '👨‍💻'
    },
    {
      name: 'Dr. Amara Okonkwo',
      role: 'Chief Data Scientist',
      background: 'PhD in Geospatial Analytics, published researcher',
      image: '👩‍🎓'
    },
    {
      name: 'James Liu',
      role: 'Head of Engineering',
      background: 'Led platform development at major tech companies',
      image: '👨‍💼'
    }
  ];

  const stats = [
    { number: '50M+', label: 'API Calls per Month' },
    { number: '120+', label: 'Countries Served' },
    { number: '5', label: 'Satellite Data Sources' },
    { number: '99.9%', label: 'Uptime SLA' }
  ];

  const faqs = [
    {
      question: 'When was the platform founded?',
      answer: 'We were founded in 2019 by a team of space scientists and software engineers who wanted to make satellite data more accessible.'
    },
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
      answer: 'We work directly with official satellite data providers, implement rigorous validation processes, and maintain comprehensive documentation. Our 99.9% uptime SLA ensures reliability.'
    }
  ];

  const handleViewDocumentation = () => {
    navigate('/documentation')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Satellite className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">About Us</h1>
          </div>
          <p className="text-slate-600">Making satellite data accessible for everyone</p>
        </div>
      </div>

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
            <CardTitle>Born from a Vision to Connect Earth and Data</CardTitle>
            <CardDescription>
              How we're making satellite data accessible to everyone
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p>
              Founded in 2019 by a team of space scientists and software engineers, our platform emerged
              from a simple frustration: accessing satellite data was too complex, expensive, and fragmented.
            </p>
            <p>
              We believed that groundbreaking insights about our planet shouldn't be locked behind
              technical barriers. So we built a unified API platform that brings together data from
              multiple satellite sources, making it as easy to work with as any modern web service.
            </p>
            <p>
              Today, we serve thousands of users across research institutions, government agencies,
              NGOs, and commercial enterprises, helping them monitor deforestation, track urban growth,
              assess crop health, respond to natural disasters, and much more.
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
            <p className="text-slate-600">Leadership committed to our mission</p>
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
            <Button className="bg-white text-blue-600 hover:bg-blue-50">
              Contact Us
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
