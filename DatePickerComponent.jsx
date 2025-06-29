// src/components/common/DatePickerComponent.jsx
import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function DatePickerComponent({
  selected,
  onChange,
  showTimeSelect = false,
  dateFormat,
  ...rest
}) {
  // default to locale date or datetime format
  const format = dateFormat ?? (showTimeSelect ? "Pp" : "P");
  return (
    <DatePicker
      selected={selected}
      onChange={onChange}
      showTimeSelect={showTimeSelect}
      dateFormat={format}
      {...rest}
    />
  );
}

