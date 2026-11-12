import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReadingForm from './ReadingForm';

const TODAY = '2026-10-15';
const setup = (props = {}) => {
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue();
  render(<ReadingForm today={TODAY} onSubmit={onSubmit} {...props} />);
  return { onSubmit, user: userEvent.setup() };
};
const value = () => screen.getByLabelText(/glucose/i);
const save = () => screen.getByRole('button', { name: /add reading/i });

test('shows an error and does not submit when the value is empty', async () => {
  const { user, onSubmit } = setup();
  await user.click(save());
  expect(await screen.findByText('Please enter a glucose value.')).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});

test.each(['39', '601', '99.5', 'abc'])('rejects %s', async (bad) => {
  const { user, onSubmit } = setup();
  await user.type(value(), bad);
  await user.click(save());
  expect(await screen.findByText('Value must be between 40 and 600 mg/dl.')).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});

test('rejects a future date', async () => {
  const { user, onSubmit } = setup();
  await user.type(value(), '110');
  const date = screen.getByLabelText(/date/i);
  await user.clear(date);
  await user.type(date, '2026-10-16');
  await user.click(save());
  expect(await screen.findByText('Date cannot be in the future.')).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});

test('submits a valid reading with the chosen slot', async () => {
  const { user, onSubmit } = setup();
  await user.selectOptions(screen.getByLabelText(/time slot/i), 'after_lunch');
  await user.type(value(), '140');
  await user.click(save());
  expect(onSubmit).toHaveBeenCalledWith({ date: TODAY, slot: 'after_lunch', value: 140 });
});

test('shows the server error message, e.g. a duplicate slot', async () => {
  const onSubmit = vi.fn().mockRejectedValue(new Error('You already have an After lunch reading for this date.'));
  const { user } = setup({ onSubmit });
  await user.type(value(), '140');
  await user.click(save());
  expect(await screen.findByText('You already have an After lunch reading for this date.')).toBeInTheDocument();
});
