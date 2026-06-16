import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Code, Eye, Bold, Italic, Underline, Link as LinkIcon, Link2Off, Undo, Redo, Edit2, ExternalLink } from 'lucide-react';
import api from '../../lib/api';
import useAppStore from '../../stores/useAppStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import Skeleton from '../../components/ui/Skeleton';

const MEETSY_FOOTER = `
  <div style="margin-top: 40px; border-top: 2px solid #000000; padding-top: 24px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="text-align: center; padding-bottom: 8px;">
          <span style="display: inline-block; background-color: #e11d48; color: #ffffff; font-family: Arial, sans-serif; font-weight: 900; font-size: 15px; letter-spacing: 2px; padding: 4px 12px; border: 2px solid #000000;">MEETSY</span>
        </td>
      </tr>
      <tr>
        <td style="text-align: center; padding-bottom: 4px;">
          <p style="margin: 0; font-size: 12px; color: #374151; font-family: Arial, sans-serif; font-weight: 600;">Professional Event Management Platform</p>
        </td>
      </tr>
      <tr>
        <td style="text-align: center;">
          <p style="margin: 0; font-size: 11px; color: #6b7280; font-family: Arial, sans-serif;">© ${new Date().getFullYear()} Meetsy · All rights reserved · <a href="#" style="color: #e11d48; text-decoration: none;">Unsubscribe</a></p>
        </td>
      </tr>
    </table>
  </div>
`.trim();

const DEFAULT_INVITE = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 2px solid #000000;">
  <!-- Header -->
  <div style="background-color: #e11d48; padding: 4px 0;"></div>
  <div style="padding: 32px 40px 0 40px; border-bottom: 1px solid #e5e7eb; margin-bottom: 0;">
    <h1 style="margin: 0 0 4px 0; font-size: 26px; font-weight: 900; color: #000000; letter-spacing: -0.5px;">{{event_title}}</h1>
    <p style="margin: 0 0 24px 0; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Exclusive Invitation</p>
  </div>
  <!-- Body -->
  <div style="padding: 28px 40px;">
    <p style="font-size: 16px; color: #111827; margin: 0 0 16px 0; font-weight: 600;">Hi {{name}},</p>
    <p style="font-size: 15px; color: #374151; line-height: 1.7; margin: 0 0 12px 0;">
      You have been exclusively invited to register for <strong style="color: #000000;">{{event_title}}</strong>. We look forward to having you join us.
    </p>
    <p style="font-size: 15px; color: #374151; line-height: 1.7; margin: 0 0 28px 0;">
      Please complete your registration by clicking the button below — your spot is reserved for a limited time.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      {{registration_link}}
    </div>
    <p style="font-size: 13px; color: #6b7280; line-height: 1.6; margin: 24px 0 0 0; padding-top: 16px; border-top: 1px solid #f3f4f6;">
      If you believe you received this invitation in error, you may disregard this email.
    </p>
  </div>
  <!-- Footer -->
  <div style="background-color: #f9fafb; padding: 20px 40px; border-top: 2px solid #000000;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="text-align: center; padding-bottom: 8px;">
          <span style="display: inline-block; background-color: #e11d48; color: #ffffff; font-family: Arial, sans-serif; font-weight: 900; font-size: 14px; letter-spacing: 2px; padding: 3px 10px; border: 2px solid #000000;">MEETSY</span>
        </td>
      </tr>
      <tr><td style="text-align: center; padding-bottom: 3px;"><p style="margin: 0; font-size: 12px; color: #374151; font-family: Arial, sans-serif; font-weight: 600;">Professional Event Management Platform</p></td></tr>
      <tr><td style="text-align: center;"><p style="margin: 0; font-size: 11px; color: #6b7280; font-family: Arial, sans-serif;">© ${new Date().getFullYear()} Meetsy · All rights reserved · <a href="#" style="color: #e11d48; text-decoration: none; font-weight: 600;">Unsubscribe</a></p></td></tr>
    </table>
  </div>
  <div style="background-color: #e11d48; padding: 3px 0;"></div>
</div>`.trim();

const DEFAULT_PENDING = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 2px solid #000000;">
  <!-- Header -->
  <div style="background-color: #e11d48; padding: 4px 0;"></div>
  <div style="padding: 32px 40px 0 40px; border-bottom: 1px solid #e5e7eb; margin-bottom: 0;">
    <h1 style="margin: 0 0 4px 0; font-size: 26px; font-weight: 900; color: #000000; letter-spacing: -0.5px;">{{event_title}}</h1>
    <p style="margin: 0 0 24px 0; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Registration Received</p>
  </div>
  <!-- Body -->
  <div style="padding: 28px 40px;">
    <p style="font-size: 16px; color: #111827; margin: 0 0 16px 0; font-weight: 600;">Hi {{name}},</p>
    <p style="font-size: 15px; color: #374151; line-height: 1.7; margin: 0 0 12px 0;">
      Thank you for submitting your registration for <strong style="color: #000000;">{{event_title}}</strong>. We have received your application and it is currently under review.
    </p>
    <p style="font-size: 15px; color: #374151; line-height: 1.7; margin: 0 0 0 0;">
      Our team will carefully review your submission and notify you via email once a decision has been made. This process typically takes 1–3 business days.
    </p>
    <!-- Status Badge -->
    <div style="margin: 24px 0; padding: 16px 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border: 2px solid #000000;">
      <p style="margin: 0; font-size: 13px; font-weight: 700; color: #000000; text-transform: uppercase; letter-spacing: 0.5px;">Status: Under Review</p>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #374151;">You will receive an email notification when your status changes.</p>
    </div>
  </div>
  <!-- Footer -->
  <div style="background-color: #f9fafb; padding: 20px 40px; border-top: 2px solid #000000;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="text-align: center; padding-bottom: 8px;">
          <span style="display: inline-block; background-color: #e11d48; color: #ffffff; font-family: Arial, sans-serif; font-weight: 900; font-size: 14px; letter-spacing: 2px; padding: 3px 10px; border: 2px solid #000000;">MEETSY</span>
        </td>
      </tr>
      <tr><td style="text-align: center; padding-bottom: 3px;"><p style="margin: 0; font-size: 12px; color: #374151; font-family: Arial, sans-serif; font-weight: 600;">Professional Event Management Platform</p></td></tr>
      <tr><td style="text-align: center;"><p style="margin: 0; font-size: 11px; color: #6b7280; font-family: Arial, sans-serif;">© ${new Date().getFullYear()} Meetsy · All rights reserved · <a href="#" style="color: #e11d48; text-decoration: none; font-weight: 600;">Unsubscribe</a></p></td></tr>
    </table>
  </div>
  <div style="background-color: #e11d48; padding: 3px 0;"></div>
</div>`.trim();

const DEFAULT_APPROVAL = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 2px solid #000000;">
  <!-- Header -->
  <div style="background-color: #e11d48; padding: 4px 0;"></div>
  <div style="padding: 32px 40px 0 40px; border-bottom: 1px solid #e5e7eb; margin-bottom: 0;">
    <h1 style="margin: 0 0 4px 0; font-size: 26px; font-weight: 900; color: #000000; letter-spacing: -0.5px;">{{event_title}}</h1>
    <p style="margin: 0 0 24px 0; font-size: 13px; color: #059669; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">✓ Registration Approved</p>
  </div>
  <!-- Body -->
  <div style="padding: 28px 40px;">
    <p style="font-size: 16px; color: #111827; margin: 0 0 16px 0; font-weight: 600;">Hi {{name}},</p>
    <p style="font-size: 15px; color: #374151; line-height: 1.7; margin: 0 0 20px 0;">
      Congratulations! Your registration for <strong style="color: #000000;">{{event_title}}</strong> has been approved. Please find your event details and QR entry code below.
    </p>
    <!-- Event Info Box -->
    <div style="margin: 0 0 24px 0; padding: 20px; background-color: #f9fafb; border: 2px solid #000000;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #111827;"><strong>Date:</strong> {{event_date}}</p>
      <p style="margin: 0; font-size: 14px; color: #111827;"><strong>Venue:</strong> {{event_venue}}</p>
    </div>
    <p style="font-size: 14px; color: #374151; font-weight: 600; text-align: center; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0;">Your QR Entry Code</p>
    <div style="text-align: center; margin: 0 0 20px 0;">
      {{qr_code}}
    </div>
    <p style="font-size: 13px; color: #6b7280; line-height: 1.6; margin: 0; padding-top: 16px; border-top: 1px solid #f3f4f6;">
      Please present this QR code at the event entrance. Arrive on time and bring a valid ID.
    </p>
  </div>
  <!-- Footer -->
  <div style="background-color: #f9fafb; padding: 20px 40px; border-top: 2px solid #000000;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="text-align: center; padding-bottom: 8px;">
          <span style="display: inline-block; background-color: #e11d48; color: #ffffff; font-family: Arial, sans-serif; font-weight: 900; font-size: 14px; letter-spacing: 2px; padding: 3px 10px; border: 2px solid #000000;">MEETSY</span>
        </td>
      </tr>
      <tr><td style="text-align: center; padding-bottom: 3px;"><p style="margin: 0; font-size: 12px; color: #374151; font-family: Arial, sans-serif; font-weight: 600;">Professional Event Management Platform</p></td></tr>
      <tr><td style="text-align: center;"><p style="margin: 0; font-size: 11px; color: #6b7280; font-family: Arial, sans-serif;">© ${new Date().getFullYear()} Meetsy · All rights reserved · <a href="#" style="color: #e11d48; text-decoration: none; font-weight: 600;">Unsubscribe</a></p></td></tr>
    </table>
  </div>
  <div style="background-color: #e11d48; padding: 3px 0;"></div>
</div>`.trim();

const DEFAULT_REJECTION = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 2px solid #000000;">
  <!-- Header -->
  <div style="background-color: #e11d48; padding: 4px 0;"></div>
  <div style="padding: 32px 40px 0 40px; border-bottom: 1px solid #e5e7eb; margin-bottom: 0;">
    <h1 style="margin: 0 0 4px 0; font-size: 26px; font-weight: 900; color: #000000; letter-spacing: -0.5px;">{{event_title}}</h1>
    <p style="margin: 0 0 24px 0; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Registration Update</p>
  </div>
  <!-- Body -->
  <div style="padding: 28px 40px;">
    <p style="font-size: 16px; color: #111827; margin: 0 0 16px 0; font-weight: 600;">Hi {{name}},</p>
    <p style="font-size: 15px; color: #374151; line-height: 1.7; margin: 0 0 16px 0;">
      Thank you for your interest in <strong style="color: #000000;">{{event_title}}</strong> and for taking the time to submit your registration.
    </p>
    <p style="font-size: 15px; color: #374151; line-height: 1.7; margin: 0 0 20px 0;">
      After careful consideration, we regret to inform you that we are unable to accommodate your registration for this event. Spaces were limited and competition was high.
    </p>
    <p style="font-size: 15px; color: #374151; line-height: 1.7; margin: 0;">
      We hope you will have the opportunity to join us at future events. Thank you again for your interest.
    </p>
  </div>
  <!-- Footer -->
  <div style="background-color: #f9fafb; padding: 20px 40px; border-top: 2px solid #000000;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="text-align: center; padding-bottom: 8px;">
          <span style="display: inline-block; background-color: #e11d48; color: #ffffff; font-family: Arial, sans-serif; font-weight: 900; font-size: 14px; letter-spacing: 2px; padding: 3px 10px; border: 2px solid #000000;">MEETSY</span>
        </td>
      </tr>
      <tr><td style="text-align: center; padding-bottom: 3px;"><p style="margin: 0; font-size: 12px; color: #374151; font-family: Arial, sans-serif; font-weight: 600;">Professional Event Management Platform</p></td></tr>
      <tr><td style="text-align: center;"><p style="margin: 0; font-size: 11px; color: #6b7280; font-family: Arial, sans-serif;">© ${new Date().getFullYear()} Meetsy · All rights reserved · <a href="#" style="color: #e11d48; text-decoration: none; font-weight: 600;">Unsubscribe</a></p></td></tr>
    </table>
  </div>
  <div style="background-color: #e11d48; padding: 3px 0;"></div>
</div>`.trim();

export default function EmailTemplateBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addToast = useAppStore(state => state.addToast);

  const [activeTab, setActiveTab] = useState('invite');
  const [viewMode, setViewMode] = useState('visual'); // 'visual' | 'code'
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeLinkPopup, setActiveLinkPopup] = useState(null); // { node, x, y, url }
  const savedRangeRef = useRef(null);
  const editorRef = useRef(null);
  // Store popup data in a ref so handlers always see fresh values without re-renders
  const linkPopupRef = useRef(null);

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      savedRangeRef.current = selection.getRangeAt(0);
    }
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (savedRangeRef.current) {
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
    } else {
      const editor = editorRef.current;
      if (editor) {
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  // Flush editor HTML into templates state (called before tab switch or save)
  const flushEditorToState = (tab = activeTab) => {
    if (editorRef.current) {
      setTemplates(prev => ({
        ...prev,
        [tab]: { ...prev[tab], html: editorRef.current.innerHTML }
      }));
    }
  };

  const [templates, setTemplates] = useState({
    invite: { subject: 'You are invited to {{event_title}}!', html: DEFAULT_INVITE },
    pending: { subject: 'Registration Received: {{event_title}}', html: DEFAULT_PENDING },
    approval: { subject: 'Your Registration is Approved: {{event_title}}', html: DEFAULT_APPROVAL },
    rejection: { subject: 'Update regarding your registration: {{event_title}}', html: DEFAULT_REJECTION }
  });
  const templatesRef = useRef(templates);
  useEffect(() => { templatesRef.current = templates; }, [templates]);

  // Set editor innerHTML imperatively — only when tab or viewMode changes.
  // This fully decouples React state from the live editor DOM.
  useEffect(() => {
    if (editorRef.current && viewMode === 'visual') {
      editorRef.current.innerHTML = templatesRef.current[activeTab]?.html || '';
    }
  }, [activeTab, viewMode]);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      const res = await api.get(`/admin/events/${id}`);
      const ev = res;
      const loaded = {
        invite: ev.inviteEmailTemplate || templatesRef.current.invite,
        pending: ev.pendingEmailTemplate || templatesRef.current.pending,
        approval: ev.approvalEmailTemplate || templatesRef.current.approval,
        rejection: ev.rejectionEmailTemplate || templatesRef.current.rejection
      };
      setTemplates(loaded);
      // Also set the editor content directly since activeTab/viewMode haven't changed
      if (editorRef.current && viewMode === 'visual') {
        editorRef.current.innerHTML = loaded[activeTab]?.html || '';
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to load event templates' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setTemplates(prev => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], [field]: value }
    }));
  };

  const DEFAULTS = {
    invite: DEFAULT_INVITE,
    pending: DEFAULT_PENDING,
    approval: DEFAULT_APPROVAL,
    rejection: DEFAULT_REJECTION,
  };

  const handleResetToDefault = () => {
    const freshHtml = DEFAULTS[activeTab];
    setTemplates(prev => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], html: freshHtml }
    }));
    // Also update the live editor DOM immediately
    if (editorRef.current && viewMode === 'visual') {
      editorRef.current.innerHTML = freshHtml;
    }
    addToast({ type: 'success', title: 'Reset', message: 'Template reset to the latest default. Save to persist.' });
  };

  const handleSave = async () => {
    // Flush current editor content before saving
    flushEditorToState();
    try {
      setIsSaving(true);
      // Use a short timeout to let the state update settle
      await new Promise(r => setTimeout(r, 50));
      const t = templatesRef.current;
      await api.put(`/admin/events/${id}`, {
        inviteEmailTemplate: t.invite,
        pendingEmailTemplate: t.pending,
        approvalEmailTemplate: t.approval,
        rejectionEmailTemplate: t.rejection
      });
      addToast({ type: 'success', title: 'Saved', message: 'Email templates updated successfully' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to save', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Link Popup Handlers
  const handleEditorClick = (e) => {
    let target = e.target;
    while (target && target.nodeName !== 'A' && target !== editorRef.current) {
      target = target.parentNode;
    }
    if (target && target.nodeName === 'A') {
      e.preventDefault();
      const rect = target.getBoundingClientRect();
      const editorRect = editorRef.current.parentElement.getBoundingClientRect();
      setTimeout(() => saveSelection(), 0);
      const popupData = {
        node: target,
        // Raw viewport coordinates for fixed positioning
        x: rect.left,
        y: rect.bottom + 6,
        url: target.getAttribute('href') || ''
      };
      linkPopupRef.current = popupData;
      setActiveLinkPopup({ ...popupData });
    } else {
      linkPopupRef.current = null;
      setActiveLinkPopup(null);
    }
  };

  const handleRemoveLink = () => {
    const popup = linkPopupRef.current;
    if (!popup || !popup.node) return;
    const node = popup.node;
    if (!node.parentNode) return;
    const textNode = document.createTextNode(node.textContent);
    node.parentNode.replaceChild(textNode, node);
    linkPopupRef.current = null;
    setActiveLinkPopup(null);
  };

  const tabs = [
    { id: 'invite', label: '1. Invitation' },
    { id: 'pending', label: '2. Pending' },
    { id: 'approval', label: '3. Approval' },
    { id: 'rejection', label: '4. Rejection' },
  ];

  if (isLoading) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="w-9 h-9 rounded-md" />
          <div>
            <Skeleton className="w-64 h-8 rounded-md mb-2" />
            <Skeleton className="w-96 h-4 rounded-md" />
          </div>
        </div>
        <Skeleton className="w-40 h-11 rounded-md" />
      </div>

      <div className="flex gap-6">
        <div className="flex-1 space-y-6">
          <div className="flex gap-2 border-b-2 border-neutral-200 dark:border-neutral-800 pb-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="w-28 h-10 rounded-md" />
            ))}
          </div>
          <Skeleton className="w-full h-[600px] rounded-md" />
        </div>
        
        <div className="w-80 flex-shrink-0 space-y-6">
          <Skeleton className="w-full h-12 rounded-md" />
          <div className="space-y-3">
            <Skeleton className="w-32 h-5 rounded-md" />
            <Skeleton className="w-full h-24 rounded-md" />
            <Skeleton className="w-full h-24 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(`/events/${id}`)}
            className="p-2 -ml-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white uppercase">Email Flow Templates</h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Design the emails sent throughout the participant journey.</p>
          </div>
        </div>
        <Button icon={Save} onClick={handleSave} isLoading={isSaving}>Save Templates</Button>
      </div>

      <div className="flex gap-6">
        {/* Editor Side */}
        <div className="flex-1 space-y-6">
          <div className="flex border-b-2 border-neutral-900 dark:border-neutral-700 overflow-x-auto">
            {tabs.map(tab => (
              <button 
                key={tab.id}
                className={`px-4 py-3 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}
                onClick={() => {
                  // Save current editor content before switching tabs
                  flushEditorToState(activeTab);
                  setActiveTab(tab.id);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-neutral-800 p-6 rounded-md border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark space-y-6">
            <Input 
              label="Subject Line" 
              value={templates[activeTab].subject} 
              onChange={(e) => handleChange('subject', e.target.value)}
            />

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-neutral-900 dark:text-white">Email Body</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetToDefault}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-black text-neutral-600 dark:text-neutral-400 border-2 border-neutral-900 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-900 hover:bg-primary-50 dark:hover:bg-neutral-800 hover:border-primary-600 dark:hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors shadow-brutal-sm dark:shadow-brutal-dark"
                    title="Reset this template to the latest built-in default"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.33"/></svg>
                    Reset to Default
                  </button>
                  <div className="flex bg-neutral-100 dark:bg-neutral-700 rounded-md p-1">
                  <button 
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'visual' ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-brutal-sm dark:shadow-brutal-dark' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}
                    onClick={() => setViewMode('visual')}
                  >
                    <Eye className="w-3.5 h-3.5" /> Visual Editor Mode
                  </button>
                  <button 
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'code' ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-brutal-sm dark:shadow-brutal-dark' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}
                    onClick={() => setViewMode('code')}
                  >
                    <Code className="w-3.5 h-3.5" /> Raw HTML
                  </button>
                </div>
                </div>
              </div>
              
              {viewMode === 'visual' ? (
                <div className="w-full border-2 border-neutral-900 dark:border-neutral-700 rounded-md bg-neutral-50 dark:bg-neutral-900 overflow-hidden flex flex-col shadow-brutal dark:shadow-brutal-dark min-h-[450px]">
                  {/* Toolbar */}
                  <div className="flex items-center gap-2 p-2 bg-neutral-100 dark:bg-neutral-800 border-b-2 border-neutral-900 dark:border-neutral-700 flex-wrap relative">
                    <div className="flex bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 rounded-md overflow-hidden shadow-brutal-sm dark:shadow-brutal-dark">
                      <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('undo', false, null); }} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors" title="Undo"><Undo size={16} /></button>
                      <div className="w-px bg-neutral-900 dark:bg-neutral-700"></div>
                      <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('redo', false, null); }} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors" title="Redo"><Redo size={16} /></button>
                    </div>

                    <div className="flex bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 rounded-md overflow-hidden shadow-brutal-sm dark:shadow-brutal-dark">
                      <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold', false, null); }} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors" title="Bold"><Bold size={16} /></button>
                      <div className="w-px bg-neutral-900 dark:bg-neutral-700"></div>
                      <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('italic', false, null); }} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors" title="Italic"><Italic size={16} /></button>
                      <div className="w-px bg-neutral-900 dark:bg-neutral-700"></div>
                      <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('underline', false, null); }} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors" title="Underline"><Underline size={16} /></button>
                      <div className="w-px bg-neutral-900 dark:bg-neutral-700"></div>
                      <button onMouseDown={(e) => { 
                        e.preventDefault();
                        const url = prompt('Enter link URL (e.g. https://google.com):');
                        if (url) document.execCommand('createLink', false, url);
                      }} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors" title="Turn selected text into a link"><LinkIcon size={16} /></button>
                    </div>

                    <div className="flex-1"></div>
                  </div>

                  {/* Editor Area */}
                  <div className="bg-neutral-100 dark:bg-neutral-950 p-6 flex justify-center flex-1 overflow-y-auto relative">
                    {/* "Email Preview" label so user knows why it's always white */}
                    <div className="absolute top-2 left-4 text-[10px] font-black text-neutral-400 dark:text-neutral-600 uppercase tracking-widest select-none">Email Preview</div>
                    <div 
                      ref={editorRef}
                      id="email-visual-editor"
                      contentEditable={true}
                      suppressContentEditableWarning={true}
                      className="w-full max-w-xl bg-white dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-600 shadow-brutal dark:shadow-brutal-dark rounded-md outline-none focus:border-primary-500 transition-shadow p-6 [&_a]:text-blue-600 [&_a]:underline [&_a]:cursor-pointer"
                      onKeyUp={saveSelection}
                      onMouseUp={saveSelection}
                      onClick={handleEditorClick}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const text = e.dataTransfer.getData('text/plain');
                        if (text) {
                          restoreSelection();
                          document.execCommand('insertText', false, text);
                        }
                      }}
                      onBlur={() => saveSelection()}
                    />

                    {/* Link Popup — fixed to viewport so overflow-hidden parents don't clip it */}
                    {activeLinkPopup && (
                      <div 
                        className="fixed z-[9999] bg-white dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark rounded-md p-2 flex items-center gap-1.5"
                        style={{ top: activeLinkPopup.y, left: activeLinkPopup.x }}
                      >
                        <input 
                          type="url" 
                          defaultValue={activeLinkPopup.url}
                          className="text-sm px-2 py-1.5 border-2 border-neutral-900 dark:border-neutral-500 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-bold w-48 outline-none focus:border-primary-500 dark:focus:border-primary-500"
                          onChange={(e) => {
                            const popup = linkPopupRef.current;
                            if (popup && popup.node && popup.node.parentNode) {
                              popup.node.setAttribute('href', e.target.value);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              linkPopupRef.current = null;
                              setActiveLinkPopup(null);
                            }
                          }}
                          autoFocus
                        />
                        <button 
                          onMouseDown={(e) => {
                            e.preventDefault();
                            window.open(linkPopupRef.current?.url || activeLinkPopup.url, '_blank');
                          }} 
                          className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md transition-colors" 
                          title="Open link in new tab"
                        >
                          <ExternalLink size={16} />
                        </button>
                        <button 
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleRemoveLink();
                          }} 
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors" 
                          title="Remove Link"
                        >
                          <Link2Off size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <textarea 
                  className="w-full font-mono text-xs border-2 border-neutral-900 dark:border-neutral-700 rounded-md p-4 bg-neutral-900 text-emerald-400 h-[400px] focus:border-primary-600 dark:focus:border-primary-500 outline-none transition-all leading-relaxed"
                  value={templates[activeTab].html}
                  onChange={(e) => handleChange('html', e.target.value)}
                  spellCheck="false"
                />
              )}
            </div>
          </div>
        </div>

        {/* Cheat Sheet Side */}
        <div className="w-80 shrink-0">
          <div className="bg-white dark:bg-neutral-800 p-5 rounded-md border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <Code className="w-5 h-5 text-primary-600" />
              <h3 className="font-black text-neutral-900 dark:text-white uppercase">Variables</h3>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              Use these variables in your subject or body. They will be replaced with real data when the email is sent.
            </p>

            <div className="space-y-4">
              {[
                { var: '{{name}}', desc: "Participant's full name", color: "blue" },
                { var: '{{event_title}}', desc: "The event's title", color: "blue" },
                { var: '{{event_date}}', desc: "Formatted event date", color: "blue" },
                { var: '{{event_venue}}', desc: "Event venue and city", color: "blue" },
                ...(activeTab === 'invite' ? [{ var: '{{registration_link}}', desc: "Secure link to the public registration form", color: "indigo" }] : []),
                ...(activeTab === 'approval' ? [{ var: '{{qr_code}}', desc: "Embeds the unique entry QR code image", color: "emerald" }] : []),
              ].map(item => (
                <div key={item.var} className="group">
                  <div 
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', item.var);
                    }}
                    className={`inline-block font-mono text-sm px-2.5 py-1 rounded-md mb-1 border cursor-grab active:cursor-grabbing transition-colors
                      ${item.color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50' : ''}
                      ${item.color === 'indigo' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/50' : ''}
                      ${item.color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50' : ''}
                    `}
                    title="Drag and drop me into the email!"
                  >
                    {item.var}
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 font-bold">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
