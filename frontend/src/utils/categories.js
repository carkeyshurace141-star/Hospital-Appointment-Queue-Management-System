const CATEGORY_OPTIONS = [
  {
    value: 'emergency',
    label: 'Emergency',
    description: 'Needs to be seen immediately.',
  },
  {
    value: 'critical',
    label: 'Critical',
    description: 'Serious condition requiring urgent care.',
  },
  {
    value: 'elderly',
    label: 'Elderly',
    description: 'Patient aged 65 or over.',
  },
  {
    value: 'disabled',
    label: 'Disabled',
    description: 'Patient with a registered disability.',
  },
  {
    value: 'regular',
    label: 'Regular',
    description: 'Routine or non-urgent visit.',
  },
];

function categoryLabel(value) {
  return CATEGORY_OPTIONS.find((option) => option.value === value)?.label || value;
}

export { CATEGORY_OPTIONS, categoryLabel };
