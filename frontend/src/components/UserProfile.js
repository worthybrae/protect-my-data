import React from 'react';
import UserEmails from './UserEmails';
import UserDevices from './UserDevices';

const UserProfile = () => {
  return (
    <div className="min-h-screen bg-indigo-600 text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold mb-4">User Profile</h1>
        <UserEmails />
        <UserDevices />
      </div>
    </div>
  );
};

export default UserProfile;