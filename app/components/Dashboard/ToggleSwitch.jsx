export default function ToggleSwitch({ id, checked, onChange, disabled }) {
  return (
    <div className="switch-container">
      <input
        type="checkbox"
        id={`switch-${id}`}
        checked={checked}
        onChange={onChange}
        className="switch-input"
        disabled={disabled}
      />
      <label
        htmlFor={`switch-${id}`}
        className={`switch-label ${disabled ? 'switch-label-disabled' : ''}`}
      />
    </div>
  );
}
