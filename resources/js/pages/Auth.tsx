import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { z } from 'zod';
import {
  Mail, Lock, User, Building2, Eye, EyeOff,
  ArrowRight, ArrowLeft, UserPlus, Send, Check, MailCheck, Globe, Coins
} from 'lucide-react';
import countries from "world-countries";
import currencyCodes from "currency-codes";


type Tab = 'login' | 'register' | 'forgot';

const calcStrength = (v: string) => {
  let s = 0;
  if (v.length >= 8) s++;
  if (/[A-Z]/.test(v)) s++;
  if (/[0-9]/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  return s;
};

const countryOptions = countries.map((c) => ({
  label: c.name.common,
  value: c.cca2,
}));

const currencyOptions = currencyCodes.data.map((c) => ({
  label: `${c.code} - ${c.currency}`,
  value: c.code,
}));

const StrengthBar = ({ value }: { value: string }) => {
  const s = calcStrength(value);
  const cls = s <= 1 ? 'bg-[#E24B4A]' : s <= 2 ? 'bg-[#EF9F27]' : 'bg-[#1D9E75]';
  return (
    <div className="mt-1.5 flex gap-1">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`flex-1 h-[3px] rounded-sm transition-colors ${i < s ? cls : 'bg-black/10'}`}
        />
      ))}
    </div>
  );
};

const InputWrap = ({
  icon: Icon, type = 'text', value, onChange, placeholder, autoComplete, id,
  showToggle, toggled, onToggle,
}: {
  icon: any; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; autoComplete?: string; id?: string;
  showToggle?: boolean; toggled?: boolean; onToggle?: () => void;
}) => (
  <div className="relative">
    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-[#A09F9A] pointer-events-none" />
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className="w-full h-10 pl-9 pr-10 border border-black/10 rounded-lg bg-[#F7F6F2] text-[#1A1A18] text-sm outline-none transition-all focus:border-[#1D9E75] focus:ring-[3px] focus:ring-[#1D9E75]/20"
    />
    {showToggle && (
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A09F9A] hover:text-[#5F5E5A]"
        aria-label={toggled ? 'Hide password' : 'Show password'}
      >
        {toggled ? <EyeOff className="h-[15px] w-[15px]" /> : <Eye className="h-[15px] w-[15px]" />}
      </button>
    )}
  </div>
);

const Field = ({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) => (
  <div className="mb-3.5">
    <label htmlFor={htmlFor} className="block text-[11px] font-medium text-[#5F5E5A] mb-1.5 uppercase tracking-wider">
      {label}
    </label>
    {children}
  </div>
);

const BrandLogo = () => (
  <div className="flex items-center gap-2.5 mb-5">
    <div className="w-[34px] h-[34px] bg-[#1D9E75] rounded-lg flex items-center justify-center flex-shrink-0">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="10" width="6" height="8" rx="1" fill="white" opacity="0.9" />
        <rect x="10" y="5" width="8" height="13" rx="1" fill="white" />
        <rect x="2" y="2" width="6" height="6" rx="1" fill="white" opacity="0.6" />
      </svg>
    </div>
    <span className="font-serif text-[18px] text-white tracking-tight">MozitzSuite</span>
  </div>
);

const CardTop = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="bg-[#085041] px-7 pt-7 pb-6">
    <BrandLogo />
    <h2 className="font-serif text-[22px] font-normal text-white leading-snug mb-1">{title}</h2>
    <p className="text-[13px] text-[#9FE1CB] font-light">{subtitle}</p>
  </div>
);

const SubmitBtn = ({ children, onClick, disabled, type = 'button' }: any) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className="w-full h-[42px] bg-[#1D9E75] hover:bg-[#0F6E56] disabled:opacity-60 active:scale-[0.985] rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 transition-all"
  >
    {children}
  </button>
);

const authSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, signIn, resetPassword, signInWithGoogle, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [tab, setTab] = useState<Tab>('login');
  const navigate = useNavigate();


  // login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // register
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [company, setCompany] = useState('');
  const [regPw, setRegPw] = useState('');
  const [showRegPw, setShowRegPw] = useState(false);
  const [terms, setTerms] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('');

  const [countryQuery, setCountryQuery] = useState("");
  const [showCountryList, setShowCountryList] = useState(false);

  const [currencyQuery, setCurrencyQuery] = useState("");
  const [showCurrencyList, setShowCurrencyList] = useState(false);

  // forgot
  const [fpStep, setFpStep] = useState<1 | 2>(1);
  const [fpEmail, setFpEmail] = useState('');
  const [fpLoading, setFpLoading] = useState(false);



  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // custom validations first (like your original logic)
    if (!terms) {
      toast.error('Please accept the Terms and Privacy Policy');
      return;
    }

    if (!first.trim()) {
      toast.error('Please enter your first name');
      return;
    }

    if (!company.trim()) {
      toast.error('Please enter your company');
      return;
    }

    if (!country.trim()) {
      toast.error('Please enter your country');
      return;
    }

    if (!currency.trim()) {
      toast.error('Please enter your currency');
      return;
    }
    // Zod validation (structured like your login/register pattern)
    try {
      authSchema.parse({
        email: regEmail,
        password: regPw,
      });
    } catch (err: any) {
      if (err?.issues?.length) {
        toast.error(err.issues[0].message);
        return;
      }

      toast.error('Invalid input');
      return;
    }

    setRegLoading(true);

    const { error } = await signUp(
      regEmail,
      regPw,
      first,
      last,
      company,
      country,
      currency
    );

    setRegLoading(false);

    if (error) {
      const message =
        typeof error === "string"
          ? error
          : error?.message || "Registration failed";

      if (message.includes("already registered")) {
        toast.error("This email is already registered. Please sign in instead.");
      } else {
        toast.error(message);
      }
    } else {
      toast.success("Account created successfully! You can now sign in.");

      setTab("login");

      setFirst("");
      setLast("");
      setRegEmail("");
      setRegPw("");
      setCompany("");

      setCountry("");
      setCountryQuery("");

      setCurrency("");
      setCurrencyQuery("");
    }
  };


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      authSchema.parse({
        email: loginEmail,
        password: loginPw,
      });
    } catch (err: any) {
      toast.error(err?.issues?.[0]?.message || "Invalid input");
      return;
    }

    setLoading(true);

    const { error } = await signIn(loginEmail, loginPw);

    setLoading(false);

    if (error) {
      const message =
        typeof error === "string"
          ? error
          : error?.message || "Login failed";

      if (message.includes("Invalid login credentials")) {
        toast.error("Invalid email or password");
      } else {
        toast.error(message);
      }
    } else {
      toast.success("Signed in successfully!");
      navigate('/');
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) toast.error('Google sign in failed.');
    setGoogleLoading(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fpEmail) {
      toast.error('Please enter your email first');
      return;
    }

    try {
      z.string().email().parse(fpEmail);
    } catch {
      toast.error('Please enter a valid email');
      return;
    }

    toast.loading('Sending password reset email...', {
      id: 'reset-password',
    });

    const { error } = await resetPassword(fpEmail);

    if (error) {
      toast.error(error.message || 'Email is not registered', {
        id: 'reset-password',
      });
    } else {
      toast.success(
        'Password reset email has been sent to your email address.',
        {
          id: 'reset-password',
        }
      );

      setFpStep(2);
    }
  };

  const TabBtn = ({ id, children }: { id: Tab; children: React.ReactNode }) => (
    <button
      onClick={() => setTab(id)}
      className={`text-[13px] font-medium px-[18px] py-[7px] rounded-full border transition-all ${tab === id
        ? 'bg-[#1D9E75] border-[#1D9E75] text-white'
        : 'bg-transparent border-black/10 text-[#5F5E5A] hover:border-[#1D9E75]/40'
        }`}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F3EF] p-4 sm:p-8 font-sans">
      <div className="flex gap-2 mb-5">
        <TabBtn id="login">Sign in</TabBtn>
        <TabBtn id="register">Create account</TabBtn>
        <TabBtn id="forgot">Forgot password</TabBtn>
      </div>

      {/* LOGIN */}
      {tab === 'login' && (
        <div className="bg-white border border-black/10 rounded-[14px] w-[420px] max-w-full overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.07)] animate-fade-in">
          <CardTop title="Welcome back" subtitle="Sign in to your ERP workspace" />
          <form onSubmit={handleLogin} className="px-7 pt-6 pb-7">
            <Field label="Work email" htmlFor="login-email">
              <InputWrap id="login-email" icon={Mail} type="email" value={loginEmail} onChange={setLoginEmail}
                placeholder="you@company.com" autoComplete="email" />
            </Field>
            <Field label="Password" htmlFor="login-pw">
              <InputWrap id="login-pw" icon={Lock} type={showLoginPw ? 'text' : 'password'}
                value={loginPw} onChange={setLoginPw} placeholder="••••••••" autoComplete="current-password"
                showToggle toggled={showLoginPw} onToggle={() => setShowLoginPw(!showLoginPw)} />
            </Field>
            <div className="text-right -mt-1.5 mb-3.5">
              <button type="button" onClick={() => setTab('forgot')} className="text-xs text-[#1D9E75] hover:underline">
                Forgot password?
              </button>
            </div>
            <SubmitBtn type="submit" disabled={loginLoading}>
              {loginLoading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                : <><ArrowRight className="h-4 w-4" /> Sign in</>}
            </SubmitBtn>

            <div className="flex items-center gap-2.5 my-4">
              <span className="flex-1 h-px bg-black/10" />
              <span className="text-xs text-[#A09F9A]">or continue with</span>
              <span className="flex-1 h-px bg-black/10" />
            </div>

            <button type="button" onClick={handleGoogle} disabled={googleLoading}
              className="w-full h-[38px] border border-black/10 rounded-lg bg-[#F7F6F2] hover:bg-[#F4F3EF] text-[#1A1A18] text-[13px] flex items-center justify-center gap-2 transition-colors">
              {googleLoading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                : <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>}
              Sign in with Google
            </button>

            <p className="text-center text-[13px] text-[#5F5E5A] mt-4">
              No account?{' '}
              <button type="button" onClick={() => setTab('register')} className="text-[#1D9E75] font-medium hover:underline">
                Create one free →
              </button>
            </p>
          </form>
        </div>
      )}

      {/* REGISTER */}
      {tab === 'register' && (
        <div className="bg-white border border-black/10 rounded-[14px] w-[420px] max-w-full overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.07)] animate-fade-in">
          <CardTop title="Start planning smarter" subtitle="Create your free workspace — no credit card needed" />
          <form onSubmit={handleRegister} className="px-7 pt-6 pb-7">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="First name" htmlFor="reg-first">
                <InputWrap id="reg-first" icon={User} value={first} onChange={setFirst} placeholder="Alex" autoComplete="given-name" />
              </Field>
              <Field label="Last name" htmlFor="reg-last">
                <InputWrap id="reg-last" icon={User} value={last} onChange={setLast} placeholder="Kumar" autoComplete="family-name" />
              </Field>
            </div>
            <Field label="Work email" htmlFor="reg-email">
              <InputWrap id="reg-email" icon={Mail} type="email" value={regEmail} onChange={setRegEmail} placeholder="alex@company.com" autoComplete="email" />
            </Field>
            <Field label="Company" htmlFor="reg-company">
              <InputWrap id="reg-company" icon={Building2} value={company} onChange={setCompany} placeholder="Acme Manufacturing" autoComplete="organization" />
            </Field>
            <Field label="Country" htmlFor="reg-country">
              <div className="relative">
                <InputWrap
                  id="reg-country"
                  icon={Globe}
                  value={countryQuery}
                  onChange={(v) => {
                    setCountryQuery(v);
                    setCountry(v); // store actual value
                    setShowCountryList(true);
                  }}
                  placeholder="Search country..."
                  autoComplete="off"
                />

                {showCountryList && countryQuery && (
                  <div className="absolute z-50 w-full mt-1 max-h-48 overflow-auto bg-white border border-black/10 rounded-lg shadow">
                    {countryOptions
                      .filter((c) =>
                        c.label.toLowerCase().includes(countryQuery.toLowerCase())
                      )
                      .slice(0, 10)
                      .map((c) => (
                        <div
                          key={c.value}
                          onClick={() => {
                            setCountry(c.label);
                            setCountryQuery(c.label);
                            setShowCountryList(false);
                          }}
                          className="px-3 py-2 text-sm hover:bg-[#F4F3EF] cursor-pointer"
                        >
                          {c.label}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </Field>

            <Field label="Currency" htmlFor="reg-currency">
              <div className="relative">
                <InputWrap
                  id="reg-currency"
                  icon={Coins}
                  value={currencyQuery}
                  onChange={(v) => {
                    setCurrencyQuery(v);
                    setCurrency(v); // store selected value
                    setShowCurrencyList(true);
                  }}
                  placeholder="Search currency..."
                  autoComplete="off"
                />

                {showCurrencyList && currencyQuery && (
                  <div className="absolute z-50 w-full mt-1 max-h-48 overflow-auto bg-white border border-black/10 rounded-lg shadow">
                    {currencyOptions
                      .filter((c) =>
                        c.label.toLowerCase().includes(currencyQuery.toLowerCase())
                      )
                      .slice(0, 10)
                      .map((c) => (
                        <div
                          key={c.value}
                          onClick={() => {
                            setCurrency(c.value);
                            setCurrencyQuery(c.label);
                            setShowCurrencyList(false);
                          }}
                          className="px-3 py-2 text-sm hover:bg-[#F4F3EF] cursor-pointer"
                        >
                          {c.label}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </Field>
            <Field label="Password" htmlFor="reg-pw">
              <InputWrap id="reg-pw" icon={Lock} type={showRegPw ? 'text' : 'password'} value={regPw} onChange={setRegPw}
                placeholder="Min. 8 characters" autoComplete="new-password"
                showToggle toggled={showRegPw} onToggle={() => setShowRegPw(!showRegPw)} />
              <StrengthBar value={regPw} />
            </Field>
            <label className="flex items-start gap-2 text-[13px] text-[#5F5E5A] mb-3.5 cursor-pointer">
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)}
                className="mt-0.5 accent-[#1D9E75]" />
              <span>I agree to the <a href="#" className="text-[#1D9E75] hover:underline">Terms of Service</a> and <a href="#" className="text-[#1D9E75] hover:underline">Privacy Policy</a></span>
            </label>
            <SubmitBtn type="submit" disabled={regLoading}>
              {regLoading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                : <><UserPlus className="h-4 w-4" /> Create account</>}
            </SubmitBtn>
            <p className="text-center text-[13px] text-[#5F5E5A] mt-4">
              Already have an account?{' '}
              <button type="button" onClick={() => setTab('login')} className="text-[#1D9E75] font-medium hover:underline">
                Sign in →
              </button>
            </p>
          </form>
        </div>
      )}

      {/* FORGOT */}
      {tab === 'forgot' && (
        <div className="bg-white border border-black/10 rounded-[14px] w-[420px] max-w-full overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.07)] animate-fade-in">
          <CardTop title="Reset your password" subtitle="We'll email you a secure reset link" />
          <div className="px-7 pt-6 pb-7">
            {/* Steps */}
            <div className="flex items-center mb-5">
              {[1, 2].map((n, i) => (
                <div key={n} className="flex items-center flex-1 last:flex-none">
                  <div className={`w-[26px] h-[26px] rounded-full border flex items-center justify-center text-[11px] font-medium transition-all ${fpStep >= n ? 'bg-[#1D9E75] border-[#1D9E75] text-white' : 'bg-[#F7F6F2] border-black/10 text-[#A09F9A]'
                    }`}>{n}</div>
                  {i < 1 && <div className={`flex-1 h-px mx-1 ${fpStep > n ? 'bg-[#1D9E75]' : 'bg-black/10'}`} />}
                </div>
              ))}
            </div>

            {fpStep === 1 ? (
              <form onSubmit={handleForgot}>
                <Field label="Work email" htmlFor="fp-email">
                  <InputWrap id="fp-email" icon={Mail} type="email" value={fpEmail} onChange={setFpEmail}
                    placeholder="you@company.com" autoComplete="email" />
                </Field>
                <SubmitBtn type="submit" disabled={fpLoading}>
                  {fpLoading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    : <><Send className="h-4 w-4" /> Send reset link</>}
                </SubmitBtn>
              </form>
            ) : (
              <div>
                <div className="bg-[#E1F5EE] border border-[#9FE1CB] rounded-lg px-3.5 py-3 flex items-start gap-2.5 mb-4">
                  <MailCheck className="h-4 w-4 text-[#085041] mt-0.5 flex-shrink-0" />
                  <p className="text-[13px] text-[#085041] leading-relaxed">
                    We sent a secure reset link to <strong>{fpEmail}</strong>. Open the email and follow the link to set a new password.
                  </p>
                </div>
                <SubmitBtn onClick={() => setTab('login')}>
                  <Check className="h-4 w-4" /> Back to sign in
                </SubmitBtn>
              </div>
            )}

            <button type="button" onClick={() => setTab('login')}
              className="flex items-center gap-1.5 text-[13px] text-[#5F5E5A] hover:text-[#1D9E75] mt-3.5 mx-auto transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </button>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-[#A09F9A] mt-6">
        © {new Date().getFullYear()} MozitzSuite. All rights reserved.
      </p>
    </div>
  );
};

export default Auth;

