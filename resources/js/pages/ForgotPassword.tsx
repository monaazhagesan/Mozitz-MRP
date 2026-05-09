import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';

const emailSchema = z.string().trim().email({ message: 'Enter a valid email address' });

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const [emailError, setEmailError] = useState('');

  const { resetPassword } = useAuth();
  const navigate = useNavigate();

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  setEmailError('');

  if (!email) {
    setEmailError('Please enter your email');
    return;
  }

  try {
    z.string().email().parse(email);
  } catch {
    setEmailError('Enter a valid email address');
    return;
  }

  setLoading(true);

  toast.loading('Checking email...', {
    id: 'reset-password',
  });

  const { error } = await resetPassword(email);

  setLoading(false);

  if (error) {
    if (
      error.toLowerCase().includes('not registered') ||
      error.toLowerCase().includes('not found') ||
      error.toLowerCase().includes('user not found')
    ) {
      setEmailError('Email is not registered'); // ✅ INLINE ERROR
      toast.error('Email is not registered', {
        id: 'reset-password',
      });
    } else {
      setEmailError(error); // fallback inline error
      toast.error(error, {
        id: 'reset-password',
      });
    }
  } else {
    setEmailError('');
    toast.success('Password reset email sent!', {
      id: 'reset-password',
    });
  }
};

 return (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">

    <Card className="w-full max-w-md shadow-xl border-0 rounded-2xl">

      {/* HEADER */}
      <CardHeader className="text-center space-y-2">

        <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
          🔐
        </div>

        <CardTitle className="text-2xl font-semibold">
          Forgot Password?
        </CardTitle>

        <CardDescription className="text-gray-500">
          No worries. Enter your email and we’ll send you a reset link.
        </CardDescription>
      </CardHeader>

      <CardContent>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* EMAIL FIELD */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email Address
            </Label>

            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError('');
              }}
              className={`h-11 ${emailError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
            />

            {emailError && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                ⚠ {emailError}
              </p>
            )}

            <p className="text-xs text-gray-400">
              We’ll send a secure password reset link to this email.
            </p>
          </div>

          {/* SUBMIT BUTTON */}
          <Button
            type="submit"
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 transition-all"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                Sending Link...
              </span>
            ) : (
              'Send Reset Link'
            )}
          </Button>

          {/* BACK BUTTON */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="text-sm text-blue-600 hover:underline"
            >
              ← Back to Login
            </button>
          </div>

        </form>
      </CardContent>
    </Card>
  </div>
);
};

export default ForgotPassword;