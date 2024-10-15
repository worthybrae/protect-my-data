import React from 'react';
import UserEmails from './UserEmails';
import UserDevices from './UserDevices';

const UserProfile = () => {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold mb-4">User Profile</h1>
      <UserEmails />
      <UserDevices />
    </div>
  );
};

export default UserProfile;