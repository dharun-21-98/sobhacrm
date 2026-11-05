import { useState } from 'react';
import { useStore } from '../data/repo';
import { users, iso } from '../data/seed';
import { latest } from '../data/rules';
import { createId } from '../lib/id';
import { Select } from './ui';

export function RemarkForm({ unitId, area = 'Unit', ticketId, done }: {
  unitId: string;
  area?: string;
  ticketId?: string;
  done?: () => void;
}) {
  const { db, userId, update } = useStore();
  const user = users.find(user => user.id === userId)!;
  const [text, setText] = useState('');
  const [selectedArea, setArea] = useState(area);
  const [editing, setEditing] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const previous = latest(db, unitId, selectedArea);

  return <form onSubmit={event => {
    event.preventDefault();
    const trimmed = text.trim();
    setMessage('');
    setError('');
    if (!trimmed) {
      setError('Enter a remark before saving.');
      return;
    }
    try {
      const id = editing || createId();
      update(database => {
        if (editing) {
          const remark = database.remarks.find(remark => remark.id === editing);
          if (!remark || remark.author !== user.name) {
            throw new Error('This remark can no longer be edited.');
          }
          remark.text = trimmed;
          remark.date = iso();
        } else {
          database.remarks.push({
            id, unitId, area: selectedArea, text: trimmed,
            author: user.name, role: user.role, date: iso(), ticketId,
          });
        }
      });
      setText('');
      setEditing('');
      setMessage(editing ? 'Remark updated.' : 'Remark added.');
      done?.();
    } catch {
      setError('Could not save the remark. Your draft is still here. Check browser storage and try again.');
    }
  }}>
    <textarea required aria-label="Remark" value={text}
      onChange={event => { setText(event.target.value); setError(''); setMessage(''); }}
      placeholder="Add an internal remark…" />
    {error && <p role="alert" className="danger">{error}</p>}
    {message && <p role="status">{message}</p>}
    <div className="form-actions">
      <Select value={selectedArea} onChange={value => {
        setArea(value); setEditing(''); setText(''); setMessage(''); setError('');
      }} options={['Unit', 'Collections', 'Handover', 'Registration', 'Ticket']} />
      {previous?.author === user.name && !editing && <button type="button"
        onClick={() => { setText(previous.text); setEditing(previous.id); setMessage(''); }}>
        Edit latest
      </button>}
      {editing && <button type="button" onClick={() => { setText(''); setEditing(''); }}>Cancel edit</button>}
      <button type="submit" className="primary">{editing ? 'Save remark' : 'Add remark'}</button>
    </div>
  </form>;
}
