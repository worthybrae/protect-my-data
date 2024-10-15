import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

const UserDevices = () => {
  const [devices, setDevices] = useState([]);
  const [newDevice, setNewDevice] = useState('');
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
      fetchDevices();
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">Your Devices</h2>
      <ul className="mb-4">
        {devices.map((device) => (
          <li key={device.id} className="flex justify-between items-center mb-2">
            <span>{device.advertising_id}</span>
            <span className={`text-sm ${device.status === 'active' ? 'text-green-500' : 'text-red-500'}`}>
              {device.status}
            </span>
          </li>
        ))}
      </ul>
      <form onSubmit={addDevice} className="space-y-4">
        <div>
          <label htmlFor="newDevice" className="block mb-1">Add New Device</label>
          <input
            type="text"
            id="newDevice"
            value={newDevice}
            onChange={(e) => setNewDevice(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>
        <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600">
          Add Device
        </button>
      </form>
    </div>
  );
};

export default UserDevices;