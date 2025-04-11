// src/components/Alert.tsx
import React from 'react';

interface AlertProps {
  type: 'info' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({ type, children }) => {
  const baseClasses = "p-4 rounded-lg border mt-2";
  let specificClasses = "";
  let IconComponent: React.ElementType | null = null;

  switch (type) {
    case 'info':
      specificClasses = "bg-blue-50 border-blue-200 text-blue-800";
      IconComponent = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      );
      break;
    case 'success':
      specificClasses = "bg-green-50 border-green-200 text-green-800";
       IconComponent = () => (
         <svg className="h-5 w-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
           <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
         </svg>
       );
      break;
    case 'warning': // Used for file size > 15MB
      specificClasses = "bg-yellow-50 border-yellow-200 text-yellow-800";
      IconComponent = () => (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
             <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.001-1.742 3.001H4.42c-1.53 0-2.493-1.667-1.743-3.001l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1.75-5.75a.75.75 0 00-1.5 0v4a.75.75 0 001.5 0v-4z" clipRule="evenodd" />
          </svg>
      );
      break;
    case 'error':
      specificClasses = "bg-red-50 border-red-200 text-red-800";
       IconComponent = () => (
         <svg className="h-5 w-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
           <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
         </svg>
       );
      break;
  }

  return (
    <div className={`${baseClasses} ${specificClasses} flex items-start`}>
      {IconComponent && <IconComponent />}
      <div className="flex-grow">{children}</div>
    </div>
  );
};

export default Alert;
