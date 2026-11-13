import React, { useState } from 'react';

interface LoginPageProps {
  onLoginSuccess: (username: string) => void;
  onNotify: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNotify }) => {
  const [username, setUsername] = useState('m.kazemi');
  const [password, setPassword] = useState('Apadana@1403');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('لطفاً نام کاربری و کلمه عبور پرسنلی خود را وارد نمایید.');
      return;
    }
    setErrorMsg('');
    onNotify('ورود موفق به سامانه A-IMS', `خوش آمدید، ${username === 'm.kazemi' ? 'مهندس مهران کاظمی' : username}`, 'success');
    onLoginSuccess(username.trim());
  };

  return (
    <div className="login-sky-bg min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-between px-4 py-6 sm:py-8">
      {/* Blurred Ambient Sky Clouds */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 w-[520px] h-[320px] rounded-full bg-white/65 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-24 w-[560px] h-[340px] rounded-full bg-white/60 blur-3xl"
      />

      {/* Top Organization Header */}
      <header className="relative z-10 w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined !text-[24px]">science</span>
          </div>
          <div className="text-center sm:text-right">
            <h1 className="text-sm sm:text-base font-extrabold text-primary">شرکت پتروشیمی آپادانا خلیج فارس</h1>
            <p className="text-[11px] sm:text-xs font-medium text-secondary">سامانه جامع مدیریت یکپارچه (IMS)</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/85 backdrop-blur-sm border border-white shadow-sm text-[11px] font-semibold text-primary">
          <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
          <span>درگاه امن احراز هویت پرسنلی</span>
        </div>
      </header>

      {/* Circular Central Card */}
      <main className="relative z-10 my-auto py-6 flex items-center justify-center w-full">
        <div className="w-full max-w-[490px] sm:w-[490px] sm:h-[490px] rounded-3xl sm:rounded-full bg-white/95 backdrop-blur-md border-[3px] border-white/95 shadow-[0px_24px_60px_-15px_rgba(20,44,67,0.18)] flex flex-col items-center justify-center p-7 sm:px-14 sm:py-10">
          <div className="w-12 h-12 rounded-2xl bg-[#e6fafd] text-[#00a8c2] flex items-center justify-center mb-3 shadow-inner">
            <span className="material-symbols-outlined !text-[26px]">home</span>
          </div>

          <h2 className="text-lg sm:text-[19px] font-extrabold text-[#00c0db] text-center mb-5">
            ورود به سامانه مدیریت یکپارچه
          </h2>

          <form onSubmit={handleSubmit} className="w-full max-w-[330px] space-y-3.5">
            {errorMsg && (
              <div className="text-[11px] font-semibold text-critical-hse bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-center">
                {errorMsg}
              </div>
            )}

            {/* Username Field */}
            <div className="relative flex items-center">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="نام کاربری یا کد پرسنلی"
                dir="ltr"
                className="w-full bg-[#f4f8fb] border border-[#d6e4ee] rounded-xl pr-4 pl-10 py-2.5 text-xs font-medium text-primary text-left placeholder:text-right placeholder:text-outline focus:outline-none focus:border-[#00c0db] focus:bg-white transition-all"
              />
              <span className="material-symbols-outlined !text-[18px] text-[#7c94a8] absolute left-3 pointer-events-none">
                person
              </span>
            </div>

            {/* Password Field */}
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="کلمه عبور"
                dir="ltr"
                className="w-full bg-[#f4f8fb] border border-[#d6e4ee] rounded-xl pr-9 pl-10 py-2.5 text-xs font-medium text-primary text-left placeholder:text-right placeholder:text-outline focus:outline-none focus:border-[#00c0db] focus:bg-white transition-all"
              />
              <span className="material-symbols-outlined !text-[18px] text-[#7c94a8] absolute left-3 pointer-events-none">
                key
              </span>
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 text-outline hover:text-primary cursor-pointer"
                tabIndex={-1}
                aria-label="نمایش کلمه عبور"
              >
                <span className="material-symbols-outlined !text-[17px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-[11px] pt-0.5">
              <label className="inline-flex items-center gap-2 text-on-surface-variant cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-border-hairline accent-[#00b4cf]"
                />
                <span>مرا به خاطر بسپار</span>
              </label>
              <span className="font-label-code text-[10px] text-outline">Active Directory SSO</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full mt-1 py-2.5 px-5 rounded-xl bg-gradient-to-l from-[#00c0db] to-[#009cb8] hover:from-[#00b0c9] hover:to-[#0089a3] text-white font-bold text-xs shadow-[0_8px_20px_-6px_rgba(0,192,219,0.55)] flex items-center justify-center gap-3 transition-all cursor-pointer"
            >
              <span>ورود به میز کار یکپارچه</span>
              <span className="h-4 w-px bg-white/35" />
              <span className="material-symbols-outlined !text-[18px]">lock_open</span>
            </button>
          </form>

          <div className="mt-5 pt-3 border-t border-border-hairline/60 w-56 text-center">
            <span className="font-label-code text-[10.5px] font-semibold text-outline">PGAPCO • IMS Ver 4.2</span>
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="relative z-10 text-center text-[11px] text-primary/75 flex flex-wrap items-center justify-center gap-2">
        <span>پورتال جامع مدیریت کیفیت، ایمنی، بهداشت، محیط زیست و انرژی پتروشیمی آپادانا خلیج فارس</span>
        <span>•</span>
        <a
          href="#pgapco"
          onClick={(e) => {
            e.preventDefault();
            onNotify('پورتال رسمی پتروشیمی آپادانا', 'نشانی اینترانت داخلی: pgapco.ir (منطقه ویژه اقتصادی انرژی پارس)', 'info');
          }}
          className="font-label-code font-bold text-secondary hover:underline"
        >
          pgapco.ir
        </a>
      </footer>
    </div>
  );
};
