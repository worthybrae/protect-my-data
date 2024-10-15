import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

const UserDevices = () => {
  const [devices, setDevices] = useState([]);
  const [newDevice, setNewDevice] = useState('');
  const [showAddDevice, setShowAddDevice] = useState(false);
  const { user } = useAuth();

  const fetchDevices = useCallback(async () => {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching devices:', error);
    } else {
      setDevices(data);
    }
  }, [user.id]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const addDevice = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('devices')
      .insert({ user_id: user.id, advertising_id: newDevice, status: 'active' });

    if (error) {
      console.error('Error adding device:', error);
    } else {
      setNewDevice('');
      setShowAddDevice(false);
      fetchDevices();
    }
  };

  return (
    <div className="bg-white bg-opacity-10 rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Your Devices</h2>
      <ul className="mb-4 space-y-2">
        {devices.map((device) => (
          <li key={device.id} className="flex justify-between items-center">
            <span>{device.advertising_id}</span>
            <span className={`text-sm ${device.status === 'active' ? 'text-green-300' : 'text-red-300'}`}>
              {device.status}
            </span>
          </li>
        ))}
      </ul>
      {!showAddDevice && (
        <button
          onClick={() => setShowAddDevice(true)}
          className="flex items-center text-white hover:text-gray-200 transition-colors duration-200"
        >
          <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M12 4v16m8-8H4"></path>
          </svg>
          Add Device
        </button>
      )}
      {showAddDevice && (
        <form onSubmit={addDevice} className="mt-4 space-y-4">
          <div>
            <input
              type="text"
              value={newDevice}
              onChange={(e) => setNewDevice(e.target.value)}
              className="w-full px-3 py-2 bg-white bg-opacity-20 border border-white border-opacity-30 rounded text-white placeholder-gray-300"
              placeholder="Enter device advertising ID"
              required
            />
          </div>
          <div className="flex space-x-2">
            <button 
              type="submit" 
              className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 transition-colors duration-200"
            >
              Add Device
            </button>
            <button 
              type="button" 
              onClick={() => setShowAddDevice(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default UserDevices;