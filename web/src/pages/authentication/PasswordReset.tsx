import AuthButton from 'components/authentication/AuthButton';
import TextField from 'components/TextField';
import { APP_NAME } from 'config';
import { Formik } from 'formik';
import useAuth from 'hooks/useAuth';
import React from 'react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import * as Yup from 'yup';

function Header() {
  return (
    <header className="w-full py-8 grid grid-cols-3">
      <div />
      <div className="flex items-center justify-center">
        <img
          src={`${process.env.PUBLIC_URL}/logo.png`}
          alt="logo"
          className="h-16 w-auto rounded-md"
        />
      </div>
      <div />
    </header>
  );
}

export default function PasswordReset() {
  const navigate = useNavigate();
  const { passwordRecovery, passwordReset } = useAuth();
  const [username, setUsername] = React.useState('');

  return !username ? (
    <>
      <Helmet>
        <title>{APP_NAME}</title>
      </Helmet>
      <Header />
      <div className="max-w-2xl flex flex-col items-center mx-auto">
        <h1 className="font-extrabold text-5xl mb-4 th-color-for">
          Reset your password
        </h1>
        <h4 className="font-normal text-lg mb-2 th-color-for">
          To reset your password, enter the email address you use to sign in
        </h4>
        <Formik
          initialValues={{
            email: '',
          }}
          enableReinitialize
          validationSchema={Yup.object().shape({
            email: Yup.string().email().max(255).required(),
          })}
          onSubmit={async ({ email }, { setSubmitting, resetForm }) => {
            setSubmitting(true);
            try {
              await passwordRecovery(email);
              setUsername(email);
              toast.success('Verification code has been sent');
              resetForm();
            } catch (err: any) {
              toast.error(err.message);
            }
            setSubmitting(false);
          }}
        >
          {({ values, handleChange, isSubmitting, handleSubmit }) => (
            <form
              onSubmit={handleSubmit}
              className="max-w-md w-full mt-10 space-y-5"
            >
              <TextField
                label="Email address"
                name="email"
                handleChange={handleChange}
                value={values.email}
                autoComplete="email"
                required
                type="email"
                placeholder="name@work-email.com"
              />
              <div className="pt-4">
                <AuthButton
                  text="Get a Reset Code"
                  isSubmitting={isSubmitting}
                />
              </div>
            </form>
          )}
        </Formik>
      </div>
    </>
  ) : (
    <>
      <Helmet>
        <title>{APP_NAME}</title>
      </Helmet>
      <Header />
      <div className="max-w-2xl flex flex-col items-center mx-auto">
        <h1 className="font-extrabold text-5xl mb-4 th-color-for">
          Reset your password
        </h1>
        <h4 className="font-normal text-lg mb-2 th-color-for">
          To reset your password, enter the code sent to your email and your new
          password
        </h4>
        <Formik
          initialValues={{
            code: '',
            newPassword: '',
          }}
          enableReinitialize
          onSubmit={async (
            { code, newPassword },
            { setSubmitting, resetForm }
          ) => {
            setSubmitting(true);
            try {
              await passwordReset(username, code, newPassword);
              toast.success('Password changed');
              setUsername('');
              resetForm();
              navigate('/');
            } catch (err: any) {
              toast.error(err.message);
            }
            setSubmitting(false);
          }}
        >
          {({ values, handleChange, isSubmitting, handleSubmit }) => (
            <form
              onSubmit={handleSubmit}
              className="max-w-md w-full mt-10 space-y-5"
            >
              <TextField
                label="Code"
                name="code"
                handleChange={handleChange}
                value={values.code}
                required
                type="text"
                placeholder="123456"
              />
              <TextField
                value={values.newPassword}
                handleChange={handleChange}
                type="password"
                label="New password"
                name="newPassword"
                required
                autoComplete="new-password"
                placeholder="Your new password"
              />
              <div className="pt-4">
                <AuthButton text="Reset password" isSubmitting={isSubmitting} />
              </div>
            </form>
          )}
        </Formik>
      </div>
    </>
  );
}
