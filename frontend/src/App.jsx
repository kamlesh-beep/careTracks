import { useEffect, useMemo, useRef, useState } from 'react';
import './index.css';

const DRIVERS = ['Venkatesh', 'Yogi', 'Ramesh', 'Chandrashekhar', 'Vignesh', 'Shashidhar', 'Rajashekhar', 'Arun', 'Surya', 'Sachin'];
const STATUS_META = {
  idle: { label: 'Idle', badge: 'status-idle' },
  enroute: { label: 'En Route', badge: 'status-enroute' },
  onscene: { label: 'On Scene', badge: 'status-onscene' },
  rescued: { label: 'Rescued', badge: 'status-rescued' },
  returning: { label: 'Returning', badge: 'status-returning' },
  completed: { label: 'Completed', badge: 'status-completed' }
};
const FLOW = [
  { key: 'enroute', icon: '🚚', label: 'En Route' },
  { key: 'onscene', icon: '📍', label: 'On Scene' },
  { key: 'rescued', icon: '🐾', label: 'Rescued' },
  { key: 'returning', icon: '↩️', label: 'Returning' },
  { key: 'completed', icon: '✅', label: 'Completed' }
];
const ANIMAL_TYPES = ['Dog', 'Cat', 'Bird', 'Cow', 'Goat', 'Snake', 'Monkey', 'Other'];
const TASK_TYPES = ['Rescue', 'Medicine', 'Sterilization', 'Other'];
const CONDITIONS = ['Critical', 'Injured', 'Stable', 'Healthy'];
const GENDERS = ['Male', 'Female', 'Unknown'];
const NEUTERED_OPTIONS = ['Yes', 'No', 'Unknown'];
const PWD = '2289';

function createState() {
  return {
    status: 'idle',
    vehicle: '',
    fuel: { start: '', end: '', photo: '' },
    animal: { type: '', gender: '', neutered: '', condition: '', remarks: '' },
    photos: [],
    tasks: [],
    history: []
  };
}

function App() {
  const [data, setData] = useState(() => Object.fromEntries(DRIVERS.map((driver) => [driver, createState()])));
  const [mode, setMode] = useState('driver');
  const [mgrAuth, setMgrAuth] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(DRIVERS[0]);
  const [activeDriver, setActiveDriver] = useState(DRIVERS[0]);
  const [password, setPassword] = useState('');
  const [toast, setToast] = useState(null);
  const [photoTarget, setPhotoTarget] = useState(null);
  const driverFormDirty = useRef(false);
  const [form, setForm] = useState({
    reporter: '',
    phone: '',
    location: '',
    animalType: '',
    taskType: '',
    notes: ''
  });
  const [driverForm, setDriverForm] = useState({
    remarks: '',
    fuelStart: '',
    fuelEnd: '',
    animalType: '',
    animalGender: '',
    animalNeutered: '',
    animalCondition: ''
  });

  const loadData = async () => {
    try {
      const response = await fetch('/api/data');
      if (response.ok) {
        const payload = await response.json();
        const next = { ...Object.fromEntries(DRIVERS.map((driver) => [driver, createState()])), ...payload };
        DRIVERS.forEach((driver) => {
          if (!next[driver]) next[driver] = createState();
        });
        setData(next);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadData();
    const interval = window.setInterval(loadData, 10000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (driverFormDirty.current) return;
    const current = data[activeDriver] || createState();
    setDriverForm({
      remarks: current.animal?.remarks || '',
      fuelStart: current.fuel?.start || '',
      fuelEnd: current.fuel?.end || '',
      animalType: current.animal?.type || '',
      animalGender: current.animal?.gender || '',
      animalNeutered: current.animal?.neutered || '',
      animalCondition: current.animal?.condition || ''
    });
  }, [activeDriver, data]);

  const updateDriverForm = (changes) => {
    driverFormDirty.current = true;
    setDriverForm((current) => ({ ...current, ...changes }));
  };

  const saveData = async (driver, state = data[driver]) => {
    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver, state })
      });
      if (!response.ok) throw new Error(`Save failed (${response.status})`);
    } catch (error) {
      console.error(error);
    }
  };

  const notify = (title, message) => setToast({ title, message });

  const dispatchTask = async () => {
    const { reporter, phone, location, animalType, taskType, notes } = form;
    if (!reporter || !phone || !location || !animalType || !taskType) {
      notify('Missing fields', 'Please complete all dispatch fields except notes.');
      return;
    }

    const taskPayload = {
      id: Date.now(),
      rn: reporter,
      rp: phone,
      ml: location,
      at: animalType,
      tt: taskType,
      nt: notes,
      t: Date.now(),
      done: false
    };
    const driverState = data[selectedDriver] || createState();
    const hasPendingTask = (driverState.tasks || []).some((task) => !task.done);
    const updatedDriver = {
      ...driverState,
      ...(hasPendingTask ? {} : {
        status: 'idle',
        fuel: { start: '', end: '', photo: '' },
        animal: { type: '', gender: '', neutered: '', condition: '', remarks: '' },
        photos: [],
        startTime: null,
        endTime: null
      }),
      tasks: [...(driverState.tasks || []), taskPayload],
      history: [...(driverState.history || []), { st: 'idle', t: Date.now(), l: `Task: ${taskType}` }]
    };
    if (selectedDriver === activeDriver) driverFormDirty.current = false;
    setData((current) => ({ ...current, [selectedDriver]: updatedDriver }));
    await saveData(selectedDriver, updatedDriver);
    setForm({ reporter: '', phone: '', location: '', animalType: '', taskType: '', notes: '' });
    notify('Task dispatched', `${selectedDriver} received a new ${taskType.toLowerCase()} task.`);
  };

  const updateStatus = async (driver, status) => {
    const next = { ...data };
    if (status === 'idle') {
      const tasks = next[driver].tasks;
      next[driver] = createState();
      next[driver].tasks = tasks.filter((task) => !task.done);
    } else {
      next[driver].status = status;
      next[driver].history.push({ st: status, t: Date.now(), l: `Status → ${STATUS_META[status].label}` });
      if (status === 'enroute' && !next[driver].startTime) next[driver].startTime = Date.now();
      if (status === 'completed') next[driver].endTime = Date.now();
    }
    setData(next);
    await saveData(driver, next[driver]);
  };

  const completeTask = async (driver) => {
    const driverState = data[driver] || createState();
    const pending = driverState.tasks.filter((task) => !task.done);
    if (!pending.length) return;
    if (!driverState.fuel.start || !driverState.fuel.end) {
      notify('Fuel missing', 'Complete fuel details before marking the task as done.');
      return;
    }
    const completedAt = Date.now();
    const tasks = driverState.tasks.map((task) => task.id === pending[0].id ? {
      ...task,
      done: true,
      doneAt: completedAt,
      report: {
        status: 'completed',
        fuel: { ...driverState.fuel },
        animal: { ...driverState.animal },
        photos: [...driverState.photos],
        startTime: driverState.startTime || null,
        endTime: completedAt
      }
    } : task);
    const remaining = tasks.filter((task) => !task.done);
    const updatedDriver = {
      ...driverState,
      tasks,
      history: [...driverState.history, { st: 'completed', t: completedAt, l: `Done: ${pending[0].tt}` }],
      status: remaining.length ? driverState.status : 'completed',
      endTime: remaining.length ? driverState.endTime : completedAt
    };
    if (remaining.length) {
      notify('Task completed', `${remaining[0].tt} is next.`);
    } else {
      notify('All done', `${driver} has completed all tasks.`);
    }
    setData((current) => ({ ...current, [driver]: updatedDriver }));
    await saveData(driver, updatedDriver);
  };

  const saveDriverData = async (driver) => {
    const next = { ...data };
    next[driver].animal.remarks = driverForm.remarks;
    next[driver].fuel.start = driverForm.fuelStart;
    next[driver].fuel.end = driverForm.fuelEnd;
    next[driver].animal.type = driverForm.animalType;
    next[driver].animal.gender = driverForm.animalGender;
    next[driver].animal.neutered = driverForm.animalNeutered;
    next[driver].animal.condition = driverForm.animalCondition;
    setData(next);
    await saveData(driver, next[driver]);
    driverFormDirty.current = false;
    notify('Saved', 'Driver details updated.');
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !photoTarget) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const next = { ...data };
      const [driver, type] = photoTarget.split('_');
      if (type === 'fuel') {
        next[driver].fuel.photo = e.target.result;
      } else {
        next[driver].photos.push({ d: e.target.result, t: Date.now() });
      }
      setData(next);
      await saveData(driver, next[driver]);
      notify('Photo saved', 'Image attached successfully.');
    };
    reader.readAsDataURL(file);
  };

  const openPhotoUploader = (driver, type) => {
    setPhotoTarget(`${driver}_${type}`);
    document.getElementById('photo-input').click();
  };

  const deletePhoto = async (driver, type, index = null) => {
    const driverState = data[driver] || createState();
    const updatedDriver = type === 'fuel'
      ? { ...driverState, fuel: { ...driverState.fuel, photo: '' } }
      : { ...driverState, photos: driverState.photos.filter((photo, photoIndex) => photoIndex !== index) };
    setData((current) => ({ ...current, [driver]: updatedDriver }));
    await saveData(driver, updatedDriver);
    notify('Photo deleted', 'The photo has been removed.');
  };

  const stats = useMemo(() => {
    const active = DRIVERS.filter((driver) => data[driver]?.status && !['idle', 'completed'].includes(data[driver].status)).length;
    const pending = DRIVERS.reduce((sum, driver) => sum + (data[driver]?.tasks || []).filter((task) => !task.done).length, 0);
    return { active, pending, total: DRIVERS.length };
  }, [data]);

  const currentDriverState = data[activeDriver] || createState();
  const pendingTasks = currentDriverState.tasks.filter((task) => !task.done);
  const activeTask = pendingTasks[0] || null;
  const selectedDriverState = data[selectedDriver] || createState();
  const selectedLatestTask = selectedDriverState.tasks[selectedDriverState.tasks.length - 1] || null;
  const selectedTaskHistory = selectedDriverState.tasks.filter((task) => task.done).slice().reverse();

  const enterManager = async () => {
    if (password === PWD) {
      setMgrAuth(true);
      setMode('manager');
      setPassword('');
      notify('Manager access', 'You are now viewing live operations.');
    } else {
      notify('Wrong password', 'Please try the manager code again.');
    }
  };

  const logoutManager = () => {
    setMgrAuth(false);
    setMode('driver');
    notify('Signed out', 'Manager view closed.');
  };

  return (
    <div className="app-shell">
      <input id="photo-input" type="file" accept="image/*" capture="environment" hidden onChange={handlePhotoUpload} />
      <header className="topbar">
        <div>
          <p className="eyebrow">CareTracks</p>
          <h1>Rescue operations, reimagined.</h1>
        </div>
        <div className="topbar-actions">
          <button className={`pill ${mode === 'manager' ? 'active' : ''}`} onClick={() => setMode('manager')}>Manager</button>
          <button className={`pill ${mode === 'driver' ? 'active' : ''}`} onClick={() => setMode('driver')}>Driver</button>
          {mode === 'manager' && mgrAuth ? <button className="pill danger" onClick={logoutManager}>Logout</button> : null}
        </div>
      </header>

      {toast ? (
        <div className="toast-card">
          <strong>{toast.title}</strong>
          <span>{toast.message}</span>
        </div>
      ) : null}

      {mode !== 'manager' || mgrAuth ? (
        <>
          {mode === 'manager' ? (
            <section className="manager-view">
              <div className="stats-grid">
                <article className="stat-card accent">
                  <span>Active units</span>
                  <strong>{stats.active}</strong>
                </article>
                <article className="stat-card">
                  <span>Pending tasks</span>
                  <strong>{stats.pending}</strong>
                </article>
                <article className="stat-card">
                  <span>Total drivers</span>
                  <strong>{stats.total}</strong>
                </article>
              </div>
              <div className="manager-grid">
                <div className="driver-list">
                  {DRIVERS.map((driver) => {
                    const state = data[driver] || createState();
                    const meta = STATUS_META[state.status] || STATUS_META.idle;
                    const pendingCount = (state.tasks || []).filter((task) => !task.done).length;
                    return (
                      <button key={driver} className={`driver-card ${selectedDriver === driver ? 'selected' : ''}`} onClick={() => setSelectedDriver(driver)}>
                        <div className="driver-card__top">
                          <span className="driver-icon">🚐</span>
                          <div>
                            <strong>{driver}</strong>
                            <p>{state.vehicle || 'No vehicle assigned'}</p>
                          </div>
                        </div>
                        <span className={`badge ${meta.badge}`}>{meta.label}</span>
                        {pendingCount > 0 ? <small>{pendingCount} task(s) pending</small> : null}
                      </button>
                    );
                  })}
                </div>
                <div className="detail-panel">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Selected driver</p>
                      <h2>{selectedDriver}</h2>
                    </div>
                    <span className={`badge ${STATUS_META[(data[selectedDriver] || createState()).status].badge}`}>
                      {STATUS_META[(data[selectedDriver] || createState()).status].label}
                    </span>
                  </div>
                  <div className="detail-section latest-task">
                    <h3>Most recent task</h3>
                    {selectedLatestTask ? (
                      <div className="task-summary">
                        <p><strong>{selectedLatestTask.tt}</strong> · {selectedLatestTask.at}</p>
                        <p><strong>Reporter:</strong> {selectedLatestTask.rn} ({selectedLatestTask.rp})</p>
                        <p><strong>Notes:</strong> {selectedLatestTask.nt || 'No notes'}</p>
                        <span className={`badge ${selectedLatestTask.done ? 'status-completed' : 'status-enroute'}`}>
                          {selectedLatestTask.done ? 'Completed' : 'Pending / active'}
                        </span>
                      </div>
                    ) : <p>No task dispatched yet.</p>}
                  </div>
                  <div className="detail-section">
                    <h3>Fuel</h3>
                    <p><strong>Start:</strong> {(data[selectedDriver]?.fuel?.start || 'Not logged')} L</p>
                    <p><strong>End:</strong> {(data[selectedDriver]?.fuel?.end || 'Not logged')} L</p>
                    {data[selectedDriver]?.fuel?.photo ? <img src={data[selectedDriver].fuel.photo} alt="Fuel snapshot" className="detail-image" /> : null}
                  </div>
                  <div className="detail-section">
                    <h3>Animal details</h3>
                    <p><strong>Type:</strong> {(data[selectedDriver]?.animal?.type || 'Not logged')}</p>
                    <p><strong>Condition:</strong> {(data[selectedDriver]?.animal?.condition || 'Not logged')}</p>
                    <p><strong>Gender:</strong> {(data[selectedDriver]?.animal?.gender || 'Not logged')}</p>
                    <p><strong>Neutered:</strong> {(data[selectedDriver]?.animal?.neutered || 'Not logged')}</p>
                    <p><strong>Remarks:</strong> {(data[selectedDriver]?.animal?.remarks || 'No remarks')}</p>
                    {(data[selectedDriver]?.photos || []).length ? (
                      <div className="photo-list manager-photos">
                        {data[selectedDriver].photos.map((photo, index) => <img key={`${photo.t}-${index}`} src={photo.d} alt="Rescue snapshot" />)}
                      </div>
                    ) : <p>No rescue photos uploaded.</p>}
                  </div>
                  <div className="detail-section dispatch-section">
                    <h3>Dispatch a task</h3>
                    <div className="form-grid">
                      <input placeholder="Reporter name" value={form.reporter} onChange={(event) => setForm({ ...form, reporter: event.target.value })} />
                      <input type="tel" placeholder="Reporter phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                      <input type="url" placeholder="Google Maps link" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
                      <select value={form.animalType} onChange={(event) => setForm({ ...form, animalType: event.target.value })}>
                        <option value="">Select animal type</option>
                        {ANIMAL_TYPES.map((animal) => <option key={animal} value={animal}>{animal}</option>)}
                      </select>
                      <select value={form.taskType} onChange={(event) => setForm({ ...form, taskType: event.target.value })}>
                        <option value="">Select task type</option>
                        {TASK_TYPES.map((task) => <option key={task} value={task}>{task}</option>)}
                      </select>
                      <textarea placeholder="Notes (optional)" rows="3" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
                    </div>
                    <button className="button primary" onClick={dispatchTask}>Send task to {selectedDriver}</button>
                  </div>
                  <div className="detail-section history-section">
                    <h3>Previous task history</h3>
                    {selectedTaskHistory.length ? selectedTaskHistory.map((task) => (
                      <details key={task.id} className="history-item">
                        <summary>{task.tt} · {task.at} · {new Date(task.doneAt || task.t).toLocaleDateString()}</summary>
                        <p><strong>Reporter:</strong> {task.rn} ({task.rp})</p>
                        <p><strong>Notes:</strong> {task.nt || 'No notes'}</p>
                        {task.report ? (
                          <>
                            <p><strong>Fuel:</strong> {task.report.fuel?.start || '-'} L → {task.report.fuel?.end || '-'} L</p>
                            <p><strong>Animal:</strong> {task.report.animal?.type || '-'}, {task.report.animal?.condition || '-'}</p>
                            <p><strong>Remarks:</strong> {task.report.animal?.remarks || 'No remarks'}</p>
                          </>
                        ) : <p>Detailed report was not captured for this older task.</p>}
                      </details>
                    )) : <p>No completed tasks yet.</p>}
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className="driver-view">
              <div className="card hero-card">
                <div>
                  <p className="eyebrow">Driver workspace</p>
                  <h2>{activeDriver}</h2>
                  <p>Handle incoming rescue tasks, update status, and keep the mission moving.</p>
                </div>
                <select value={activeDriver} onChange={(event) => { driverFormDirty.current = false; setActiveDriver(event.target.value); }} className="select">
                  {DRIVERS.map((driver) => <option key={driver} value={driver}>{driver}</option>)}
                </select>
              </div>

              <div className="main-grid driver-task-grid">
                <div className="card">
                  <div className="card-heading">
                    <h3>Active task</h3>
                    <span>{activeTask ? 'In progress' : 'Waiting'}</span>
                  </div>
                  {activeTask ? (
                    <div className="task-card">
                      <h4>{activeTask.tt}</h4>
                      <p><strong>Reporter:</strong> {activeTask.rn}</p>
                      <p><strong>Phone:</strong> {activeTask.rp}</p>
                      <p><strong>Animal:</strong> {activeTask.at}</p>
                      <p><strong>Notes:</strong> {activeTask.nt}</p>
                      <div className="action-row">
                        {activeTask.ml ? <a href={activeTask.ml} target="_blank" rel="noreferrer" className="button secondary">Open map</a> : null}
                        {activeTask.rp ? <a href={`tel:${activeTask.rp}`} className="button secondary">Call</a> : null}
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state">No task assigned yet.</div>
                  )}
                </div>
              </div>

              <div className="status-grid">
                {FLOW.map((step) => (
                  <button key={step.key} className={`status-pill ${currentDriverState.status === step.key ? 'selected' : ''}`} onClick={() => updateStatus(activeDriver, step.key)}>
                    <span>{step.icon}</span>
                    {step.label}
                  </button>
                ))}
              </div>

              <div className="main-grid">
                <div className="card">
                  <div className="card-heading">
                    <h3>Fuel & incident details</h3>
                    <span>Required field</span>
                  </div>
                  <div className="form-grid compact">
                    <input placeholder="Start fuel (L)" value={driverForm.fuelStart} onChange={(event) => updateDriverForm({ fuelStart: event.target.value })} />
                    <input placeholder="End fuel (L)" value={driverForm.fuelEnd} onChange={(event) => updateDriverForm({ fuelEnd: event.target.value })} />
                    <select value={driverForm.animalType} onChange={(event) => updateDriverForm({ animalType: event.target.value })}>
                      <option value="">Type of animal rescued</option>
                      {ANIMAL_TYPES.map((animal) => <option key={animal} value={animal}>{animal}</option>)}
                    </select>
                    <select value={driverForm.animalCondition} onChange={(event) => updateDriverForm({ animalCondition: event.target.value })}>
                      <option value="">Animal condition</option>
                      {CONDITIONS.map((condition) => <option key={condition} value={condition}>{condition}</option>)}
                    </select>
                    <select value={driverForm.animalGender} onChange={(event) => updateDriverForm({ animalGender: event.target.value })}>
                      <option value="">Gender</option>
                      {GENDERS.map((gender) => <option key={gender} value={gender}>{gender}</option>)}
                    </select>
                    <select value={driverForm.animalNeutered} onChange={(event) => updateDriverForm({ animalNeutered: event.target.value })}>
                      <option value="">Neutered</option>
                      {NEUTERED_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                    <textarea placeholder="Remarks" rows="3" value={driverForm.remarks} onChange={(event) => updateDriverForm({ remarks: event.target.value })} />
                  </div>
                  <div className="action-row">
                    <button className="button primary" onClick={() => saveDriverData(activeDriver)}>Save details</button>
                    <button className="button secondary" onClick={() => openPhotoUploader(activeDriver, 'fuel')}>Add fuel photo</button>
                    {currentDriverState.fuel.photo ? <button className="button danger" onClick={() => deletePhoto(activeDriver, 'fuel')}>Delete fuel photo</button> : null}
                  </div>
                </div>
                <div className="card">
                  <div className="card-heading">
                    <h3>Photo gallery</h3>
                    <span>Mission snapshots</span>
                  </div>
                  <div className="photo-list">
                    {currentDriverState.photos.length ? currentDriverState.photos.map((photo, index) => (
                      <div className="photo-item" key={`${photo.t}-${index}`}>
                        <img src={photo.d} alt="Rescue snapshot" />
                        <button type="button" onClick={() => deletePhoto(activeDriver, 'rescue', index)}>Delete</button>
                      </div>
                    )) : <div className="empty-state">No photos captured yet.</div>}
                  </div>
                  <button className="button secondary" onClick={() => openPhotoUploader(activeDriver, 'photo')}>Capture photo</button>
                  <button className="button primary" onClick={() => completeTask(activeDriver)} style={{ marginTop: '0.7rem' }}>Complete task</button>
                </div>
              </div>
            </section>
          )}
        </>
      ) : (
        <section className="unlock-card">
          <h2>Manager access</h2>
          <p>Enter the secure passcode to view the operations dashboard.</p>
          <input type="password" placeholder="Enter manager code" value={password} onChange={(event) => setPassword(event.target.value)} />
          <button className="button primary" onClick={enterManager}>Unlock dashboard</button>
        </section>
      )}
    </div>
  );
}

export default App;
