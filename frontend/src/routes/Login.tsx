import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { API_BASE_URL } from "@/config";

export default function Login() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to BudgetBuddy</CardTitle>
          <CardDescription>Sign in to continue. API base: {API_BASE_URL}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full">Sign in (placeholder)</Button>
        </CardContent>
      </Card>
    </div>
  );
}
