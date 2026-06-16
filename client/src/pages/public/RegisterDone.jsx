import React from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export default function RegisterDone() {
  const location = useLocation();
  const event = location.state?.event;
  const isWaitlisted = location.state?.isWaitlisted;

  if (!event) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-md w-full bg-white dark:bg-neutral-800 p-8 rounded-md shadow-brutal dark:shadow-brutal-dark border-2 border-neutral-900 dark:border-neutral-700 text-center space-y-6">
        
        <div className="mx-auto w-16 h-16 bg-success-500 border-2 border-neutral-900 rounded-md flex items-center justify-center mb-6 shadow-brutal-sm">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        
        <h1 className="text-2xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">
          {isWaitlisted ? 'You are on the Waitlist!' : 'Registration Received!'}
        </h1>
        
        <p className="text-neutral-600 dark:text-neutral-400 font-bold">
          Thank you for registering for <span className="font-black text-neutral-900 dark:text-white">{event.title}</span>. 
          {isWaitlisted 
            ? ' Currently, this event has reached its maximum capacity. We have added you to our waitlist.'
            : ' Your registration is currently pending approval.'}
        </p>

        <div className="bg-white dark:bg-neutral-800 rounded-md p-4 text-sm text-neutral-900 dark:text-white font-bold text-left space-y-2 border-2 border-neutral-900 dark:border-neutral-500 shadow-brutal-sm dark:shadow-brutal-dark">
          <div className="flex justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">Date</span>
            <span className="font-black">{new Date(event.date).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">Time</span>
            <span className="font-black">{event.timeStart} - {event.timeEnd}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">Location</span>
            <span className="font-black text-right max-w-[150px] truncate" title={event.venue}>{event.venue}</span>
          </div>
        </div>

        <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400 pt-2">
          {isWaitlisted
            ? 'We will notify you immediately via email if a spot opens up.'
            : 'You will receive an email confirmation containing your QR code once your registration is approved.'}
        </p>

        <div className="pt-4">
          <p className="text-center text-xs font-black text-neutral-400 dark:text-neutral-500">
            Powered by Meetsy
          </p>
        </div>
      </div>
    </div>
  );
}
