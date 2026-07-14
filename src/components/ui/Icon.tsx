interface IconProps {
  name: string;
  style?: React.CSSProperties;
}

export function Icon({ name, style }: IconProps) {
  return <span className={`ic ${name}`} style={style} />;
}
