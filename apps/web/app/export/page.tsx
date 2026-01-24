import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ExportPage() {
  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Export Portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Export your portfolio</p>
        </CardContent>
      </Card>
    </div>
  );
}
